# 里程碑 1：存储层增强

**状态**：⏳ 待开始
**预计耗时**：60 分钟
**依赖**：无

## 目标

实现 WIP 版本管理逻辑，增强存储层支持版本快照、回滚和智能版本号推荐功能。

## 任务清单

### 1. 添加 WIP 版本常量

- [ ] 在 `app/lib/storage/constants.ts` 中添加 WIP 版本标识：
  ```typescript
  /**
   * WIP (Work In Progress) 版本号
   * 活跃工作区使用固定的 0.0.0 版本号
   * 所有编辑操作直接更新此版本
   */
  export const WIP_VERSION = "0.0.0";

  /**
   * 默认首版本号
   * 当项目没有历史版本时，推荐使用此版本号
   */
  export const DEFAULT_FIRST_VERSION = "1.0.0";
  ```

### 2. 修改 xml-version-engine.ts 支持 WIP 模式

- [ ] 在 `app/lib/storage/xml-version-engine.ts` 中修改 `computeVersionPayload()`：
  ```typescript
  import { WIP_VERSION, ZERO_SOURCE_VERSION_ID } from './constants';

  export async function computeVersionPayload(
    newXml: string,
    semanticVersion: string,
    projectUuid: string,
    getVersionById: (id: string) => Promise<XMLVersion | undefined>,
    name?: string,
    description?: string
  ): Promise<Omit<XMLVersion, 'id' | 'created_at'>> {
    // WIP 版本始终为关键帧（全量存储）
    if (semanticVersion === WIP_VERSION) {
      return {
        project_uuid: projectUuid,
        semantic_version: WIP_VERSION,
        name: name || 'WIP',
        description: description || '活跃工作区',
        source_version_id: ZERO_SOURCE_VERSION_ID,
        is_keyframe: true,
        diff_chain_depth: 0,
        xml_content: newXml,
        metadata: null,
      };
    }

    // 历史版本：使用现有的关键帧+Diff 混合策略
    // ... 现有逻辑保持不变
  }
  ```

### 3. 增强 useStorageXMLVersions Hook

- [ ] 在 `app/hooks/useStorageXMLVersions.ts` 中添加新方法：

#### 3.1 区分 WIP 和历史版本的保存逻辑

```typescript
import { WIP_VERSION } from '@/lib/storage/constants';

// 修改现有的 saveXML 方法，确保只更新 WIP 版本
const saveXML = useCallback(
  async (
    projectUuid: string,
    xmlContent: string,
    name?: string,
    description?: string
  ): Promise<string> => {
    const adapter = await getAdapter();

    // 始终保存到 WIP 版本
    const versionPayload = await computeVersionPayload(
      xmlContent,
      WIP_VERSION, // 固定使用 WIP_VERSION
      projectUuid,
      async (id) => adapter.getXMLVersion(id),
      name,
      description
    );

    // 检查 WIP 版本是否已存在
    const existingVersions = await adapter.getXMLVersionsByProject(projectUuid);
    const wipVersion = existingVersions.find(v => v.semantic_version === WIP_VERSION);

    if (wipVersion) {
      // 更新现有 WIP 版本
      await adapter.updateXMLVersion(wipVersion.id, versionPayload);
      return wipVersion.id;
    } else {
      // 创建新的 WIP 版本
      return await adapter.saveXMLVersion(versionPayload);
    }
  },
  []
);
```

#### 3.2 创建历史版本快照

```typescript
/**
 * 从 WIP 创建历史版本快照
 * @param projectUuid 项目 UUID
 * @param semanticVersion 版本号（如 "1.0.0"）
 * @param description 版本描述
 * @returns 新版本的 ID
 */
const createHistoricalVersion = useCallback(
  async (
    projectUuid: string,
    semanticVersion: string,
    description?: string
  ): Promise<string> => {
    const adapter = await getAdapter();

    // 获取当前 WIP 版本的内容
    const versions = await adapter.getXMLVersionsByProject(projectUuid);
    const wipVersion = versions.find(v => v.semantic_version === WIP_VERSION);

    if (!wipVersion) {
      throw new Error('WIP 版本不存在，无法创建快照');
    }

    // 恢复 WIP 的完整 XML（如果是 Diff 则需要 materialize，但 WIP 始终是关键帧）
    const wipXml = wipVersion.xml_content;

    // 获取最后一个历史版本作为 source_version
    const historicalVersions = versions
      .filter(v => v.semantic_version !== WIP_VERSION)
      .sort((a, b) => b.created_at - a.created_at);
    const lastHistoricalVersion = historicalVersions[0];

    // 计算新版本的存储策略（关键帧 or Diff）
    const versionPayload = await computeVersionPayload(
      wipXml,
      semanticVersion,
      projectUuid,
      async (id) => adapter.getXMLVersion(id),
      semanticVersion, // name 使用版本号
      description
    );

    // 如果有历史版本，设置正确的 source_version_id
    if (lastHistoricalVersion) {
      versionPayload.source_version_id = lastHistoricalVersion.id;
    }

    // 保存新历史版本
    return await adapter.saveXMLVersion(versionPayload);
  },
  []
);
```

#### 3.3 版本回滚功能

```typescript
/**
 * 回滚到指定历史版本
 * 将历史版本的内容覆盖到 WIP
 * @param projectUuid 项目 UUID
 * @param versionId 目标版本 ID
 * @returns WIP 版本的 ID
 */
const rollbackToVersion = useCallback(
  async (
    projectUuid: string,
    versionId: string
  ): Promise<string> => {
    const adapter = await getAdapter();

    // 获取目标版本
    const targetVersion = await adapter.getXMLVersion(versionId);
    if (!targetVersion) {
      throw new Error('目标版本不存在');
    }

    // 恢复目标版本的完整 XML
    const targetXml = await materializeVersionXml(
      targetVersion,
      async (id) => adapter.getXMLVersion(id)
    );

    // 将目标版本的内容写入 WIP
    return await saveXML(
      projectUuid,
      targetXml,
      'WIP',
      `回滚自版本 ${targetVersion.semantic_version}`
    );
  },
  [saveXML]
);
```

#### 3.4 智能版本号推荐

```typescript
/**
 * 获取推荐的下一个版本号
 * @param projectUuid 项目 UUID
 * @returns 推荐的版本号（如 "1.0.1"）
 */
const getRecommendedVersion = useCallback(
  async (projectUuid: string): Promise<string> => {
    const adapter = await getAdapter();

    // 获取所有历史版本（排除 WIP）
    const versions = await adapter.getXMLVersionsByProject(projectUuid);
    const historicalVersions = versions
      .filter(v => v.semantic_version !== WIP_VERSION)
      .map(v => v.semantic_version)
      .sort((a, b) => {
        // 语义化版本排序
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aNum = aParts[i] || 0;
          const bNum = bParts[i] || 0;
          if (aNum !== bNum) return bNum - aNum;
        }
        return 0;
      });

    if (historicalVersions.length === 0) {
      // 没有历史版本，推荐 1.0.0
      return DEFAULT_FIRST_VERSION;
    }

    // 获取最大版本号并递增 patch 版本
    const latestVersion = historicalVersions[0];
    const parts = latestVersion.split('.').map(Number);

    if (parts.length === 3) {
      // x.y.z 格式：递增 z
      parts[2] += 1;
      return parts.join('.');
    } else if (parts.length === 4) {
      // x.y.z.h 格式：递增 h
      parts[3] += 1;
      return parts.join('.');
    } else {
      // 异常情况，返回默认值
      return DEFAULT_FIRST_VERSION;
    }
  },
  []
);
```

#### 3.5 版本号验证

```typescript
/**
 * 验证版本号格式
 * @param version 版本号字符串
 * @returns 是否有效
 */
const validateVersion = useCallback(
  (version: string): { valid: boolean; error?: string } => {
    // 检查格式：x.y.z 或 x.y.z.h
    const versionRegex = /^\d+\.\d+\.\d+(\.\d+)?$/;
    if (!versionRegex.test(version)) {
      return {
        valid: false,
        error: '版本号格式错误，应为 x.y.z 或 x.y.z.h 格式'
      };
    }

    // 不允许使用保留的 WIP 版本号
    if (version === WIP_VERSION) {
      return {
        valid: false,
        error: '0.0.0 是系统保留版本号，请使用其他版本号'
      };
    }

    return { valid: true };
  },
  []
);

/**
 * 检查版本号是否已存在
 * @param projectUuid 项目 UUID
 * @param version 版本号
 * @returns 是否已存在
 */
const isVersionExists = useCallback(
  async (projectUuid: string, version: string): Promise<boolean> => {
    const adapter = await getAdapter();
    const versions = await adapter.getXMLVersionsByProject(projectUuid);
    return versions.some(v => v.semantic_version === version);
  },
  []
);
```

### 4. 导出新方法

- [ ] 在 `useStorageXMLVersions` Hook 的返回值中添加新方法：
  ```typescript
  return {
    saveXML,
    getCurrentXML,
    getAllXMLVersions,
    getXMLVersion,
    deleteXMLVersion,
    // 新增方法
    createHistoricalVersion,
    rollbackToVersion,
    getRecommendedVersion,
    validateVersion,
    isVersionExists,
  };
  ```

## 验收标准

- [ ] `WIP_VERSION` 和 `DEFAULT_FIRST_VERSION` 常量已添加
- [ ] `computeVersionPayload()` 正确处理 WIP 版本（始终为关键帧）
- [ ] `saveXML()` 始终保存到 WIP 版本（0.0.0）
- [ ] `createHistoricalVersion()` 能从 WIP 创建历史版本快照
- [ ] `rollbackToVersion()` 能将历史版本内容覆盖到 WIP
- [ ] `getRecommendedVersion()` 能智能推荐下一个版本号
- [ ] `validateVersion()` 能正确验证版本号格式
- [ ] `isVersionExists()` 能检查版本号是否重复
- [ ] 所有新方法有完整的 TypeScript 类型定义
- [ ] 所有新方法有详细的 JSDoc 注释

## 测试步骤

1. **测试 WIP 版本保存**
   ```typescript
   // 在浏览器控制台测试
   const { saveXML } = useStorageXMLVersions();
   await saveXML(projectUuid, '<mxGraphModel>...</mxGraphModel>');
   // 验证：查看数据库中 semantic_version 为 "0.0.0" 的记录
   ```

2. **测试创建历史版本**
   ```typescript
   const { createHistoricalVersion } = useStorageXMLVersions();
   const versionId = await createHistoricalVersion(
     projectUuid,
     '1.0.0',
     '首个正式版本'
   );
   // 验证：查看数据库中新增的 "1.0.0" 版本
   ```

3. **测试版本回滚**
   ```typescript
   const { rollbackToVersion } = useStorageXMLVersions();
   await rollbackToVersion(projectUuid, historicalVersionId);
   // 验证：WIP 版本的内容被历史版本覆盖
   ```

4. **测试智能版本号推荐**
   ```typescript
   const { getRecommendedVersion } = useStorageXMLVersions();
   const recommended = await getRecommendedVersion(projectUuid);
   console.log(recommended); // 应输出 "1.0.1" 或 "1.0.0"
   ```

5. **测试版本号验证**
   ```typescript
   const { validateVersion, isVersionExists } = useStorageXMLVersions();
   console.log(validateVersion('1.0.0')); // { valid: true }
   console.log(validateVersion('0.0.0')); // { valid: false, error: '...' }
   console.log(validateVersion('abc')); // { valid: false, error: '...' }

   const exists = await isVersionExists(projectUuid, '1.0.0');
   console.log(exists); // true or false
   ```

## 设计要点

### WIP 版本特性

- **固定版本号**：0.0.0 是系统保留标识
- **始终全量**：不使用 Diff，is_keyframe=true
- **实时更新**：所有编辑操作直接更新此版本
- **唯一性**：每个项目只有一个 WIP 版本

### 历史版本创建

- **快照机制**：从 WIP 复制完整 XML
- **Diff 优化**：根据差异率和链深度决定关键帧
- **版本链**：source_version_id 指向前一个历史版本
- **只读保护**：历史版本创建后不可修改

### 智能版本号推荐

- **首次创建**：推荐 1.0.0
- **递增规则**：x.y.z → x.y.(z+1)
- **未来兼容**：支持 x.y.z.h 格式
- **唯一性检查**：防止版本号冲突

### 版本回滚策略

- **直接替换**：不创建新历史版本
- **Diff 恢复**：自动 materialize 为完整 XML
- **用户控制**：回滚后用户决定是否保存
- **编辑器同步**：需配合前端触发重载

## 注意事项

- ⚠️ WIP 版本的 source_version_id 始终为 ZERO_SOURCE_VERSION_ID
- ⚠️ 历史版本的 source_version_id 指向前一个历史版本（不指向 WIP）
- ⚠️ WIP 版本不参与 Diff 链计算（diff_chain_depth=0）
- ⚠️ 回滚操作不创建新版本，直接覆盖 WIP
- ⚠️ 版本号 0.0.0 是保留版本号，用户不可使用

## 破坏性变更

- ⚠️ `saveXML()` 方法行为改变：始终保存到 WIP 版本
- ⚠️ 新建项目时需自动创建 WIP 版本（semantic_version="0.0.0"）
- ⚠️ 现有项目迁移：需为每个项目创建 WIP 版本

## 迁移方案

对于已有项目，需要在首次加载时检查并创建 WIP 版本：

```typescript
// 在 useStorageProjects 的 loadProject() 中添加
const ensureWIPVersion = async (projectUuid: string) => {
  const adapter = await getAdapter();
  const versions = await adapter.getXMLVersionsByProject(projectUuid);
  const wipVersion = versions.find(v => v.semantic_version === WIP_VERSION);

  if (!wipVersion) {
    // 获取最后一个版本的内容作为 WIP 初始内容
    const lastVersion = versions.sort((a, b) => b.created_at - a.created_at)[0];
    const xmlContent = lastVersion
      ? await materializeVersionXml(lastVersion, (id) => adapter.getXMLVersion(id))
      : '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';

    await saveXML(projectUuid, xmlContent, 'WIP', '活跃工作区');
  }
};
```

---

**下一步**：完成后继续 [里程碑 2：UI 组件开发](./milestone-2.md)
