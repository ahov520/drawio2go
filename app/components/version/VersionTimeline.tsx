"use client";

import React from "react";
import { Button, Skeleton } from "@heroui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { History } from "lucide-react";
import { VersionCard } from "./VersionCard";
import { WIP_VERSION } from "@/app/lib/storage/constants";
import type { XMLVersion } from "@/app/lib/storage/types";
import type { VersionPair } from "@/app/hooks/useVersionCompare";

// 虚拟滚动阈值 - 版本数量超过此值时启用虚拟滚动（极致紧凑优化）
const VIRTUAL_SCROLL_THRESHOLD = 30;

interface VersionTimelineProps {
  projectUuid: string;
  versions: XMLVersion[];
  onVersionRestore?: (versionId: string) => void;
  onVersionCreated?: () => void;
  isLoading?: boolean;
  compareMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (versionId: string) => void;
  onQuickCompare?: (pair: VersionPair) => void;
}

/**
 * 版本时间线组件 - 支持虚拟滚动
 * 显示所有历史版本的时间线列表（不包括 WIP 版本）
 * 当版本数 > 30 时自动启用虚拟滚动优化性能（极致紧凑优化）
 */
export function VersionTimeline({
  versions,
  onVersionRestore,
  isLoading = false,
  compareMode = false,
  selectedIds = [],
  onToggleSelect,
  onQuickCompare,
}: VersionTimelineProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const skeletonItems = React.useMemo(() => Array.from({ length: 3 }), []);
  const selectedIdSet = React.useMemo(
    () => new Set(selectedIds),
    [selectedIds],
  );
  const getCompareOrder = React.useCallback(
    (id: string) => {
      if (!compareMode) return null;
      const index = selectedIds.indexOf(id);
      return index === -1 ? null : index;
    },
    [compareMode, selectedIds],
  );

  // 拆分 WIP 与历史版本，确保只保留最新的 WIP 并放在列表首位
  const { timelineVersions, historicalVersions, hasWip } = React.useMemo(() => {
    try {
      const wipCandidates = versions
        .filter((version) => version.semantic_version === WIP_VERSION)
        .sort((a, b) => b.created_at - a.created_at);
      const wip = wipCandidates[0] ?? null;

      const historical = versions
        .filter((version) => version.semantic_version !== WIP_VERSION)
        .sort((a, b) => b.created_at - a.created_at);

      const combined = wip ? [wip, ...historical] : historical;

      return {
        timelineVersions: combined,
        historicalVersions: historical,
        hasWip: Boolean(wip),
      };
    } catch (error) {
      console.error("版本排序失败:", error);
      return { timelineVersions: [], historicalVersions: [], hasWip: false };
    }
  }, [versions]);

  const historicalCount = historicalVersions.length;

  // 是否启用虚拟滚动
  const enableVirtualScroll =
    !isLoading && timelineVersions.length > VIRTUAL_SCROLL_THRESHOLD;

  // 配置虚拟滚动器
  const virtualizer = useVirtualizer({
    count: timelineVersions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 5,
    enabled: enableVirtualScroll,
  });

  if (isLoading) {
    return (
      <div className="version-timeline">
        <div className="timeline-header">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-3 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="timeline-list timeline-list--skeleton">
          {skeletonItems.map((_, index) => (
            <Skeleton
              key={`timeline-skeleton-${index}`}
              className="h-20 rounded-xl"
            />
          ))}
        </div>
      </div>
    );
  }

  // 如果没有历史版本，显示空状态
  if (timelineVersions.length === 0) {
    return (
      <div className="version-timeline-empty">
        <div className="empty-state-small">
          <div className="empty-state-icon">
            <History className="w-5 h-5" />
          </div>
          <p>暂无历史版本</p>
          <p>点击“保存版本”创建第一份快照</p>
        </div>
      </div>
    );
  }

  // 渲染虚拟滚动列表
  const renderVirtualList = () => {
    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div
        ref={parentRef}
        className="timeline-list"
        style={{
          height: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualItem) => {
            const version = timelineVersions[virtualItem.index];
            const isWipEntry = version.semantic_version === WIP_VERSION;
            const isLatestEntry = hasWip
              ? virtualItem.index === 1
              : virtualItem.index === 0;
            return (
              <div
                key={version.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <VersionCard
                  version={version}
                  isLatest={!isWipEntry && isLatestEntry}
                  isWIP={isWipEntry}
                  onRestore={onVersionRestore}
                  compareMode={compareMode}
                  selected={!isWipEntry && selectedIdSet.has(version.id)}
                  compareOrder={isWipEntry ? null : getCompareOrder(version.id)}
                  onToggleSelect={isWipEntry ? undefined : onToggleSelect}
                  onQuickCompare={(() => {
                    if (isWipEntry) return undefined;
                    const previous = timelineVersions[virtualItem.index + 1];
                    if (
                      !previous ||
                      previous.semantic_version === WIP_VERSION ||
                      !onQuickCompare
                    )
                      return undefined;
                    return () => {
                      const [older, newer] =
                        previous.created_at <= version.created_at
                          ? [previous, version]
                          : [version, previous];
                      onQuickCompare({ versionA: older, versionB: newer });
                    };
                  })()}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染普通列表（无虚拟滚动）
  const renderNormalList = () => (
    <div className="timeline-list">
      {timelineVersions.map((version, index) => {
        const isWipEntry = version.semantic_version === WIP_VERSION;
        const isLatestEntry = hasWip ? index === 1 : index === 0;
        return (
          <VersionCard
            key={version.id}
            version={version}
            isLatest={!isWipEntry && isLatestEntry}
            isWIP={isWipEntry}
            onRestore={onVersionRestore}
            compareMode={compareMode}
            selected={!isWipEntry && selectedIdSet.has(version.id)}
            compareOrder={isWipEntry ? null : getCompareOrder(version.id)}
            onToggleSelect={isWipEntry ? undefined : onToggleSelect}
            onQuickCompare={(() => {
              if (isWipEntry) return undefined;
              const previous = timelineVersions[index + 1];
              if (
                !previous ||
                previous.semantic_version === WIP_VERSION ||
                !onQuickCompare
              )
                return undefined;
              return () => {
                const [older, newer] =
                  previous.created_at <= version.created_at
                    ? [previous, version]
                    : [version, previous];
                onQuickCompare({ versionA: older, versionB: newer });
              };
            })()}
          />
        );
      })}
    </div>
  );

  return (
    <div className="version-timeline">
      {/* 时间线头部 */}
      <div className="timeline-header">
        <div>
          <h3>历史版本</h3>
          <p className="timeline-description">
            按时间倒序的快照记录
            {enableVirtualScroll && " • 虚拟滚动已启用"}
            {compareMode && " • 对比模式"}
          </p>
        </div>
        <div className="timeline-header__actions">
          <span className="timeline-chip">
            历史快照 {historicalCount} 个{hasWip ? " + WIP" : ""}
          </span>
          {compareMode && historicalVersions.length >= 2 && (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                if (!onQuickCompare) return;
                const latest = historicalVersions[0];
                const previous = historicalVersions[1];
                if (!latest || !previous) return;
                const [older, newer] =
                  previous.created_at <= latest.created_at
                    ? [previous, latest]
                    : [latest, previous];
                onQuickCompare({ versionA: older, versionB: newer });
              }}
            >
              最新 vs 上一版本
            </Button>
          )}
        </div>
      </div>

      {/* 版本列表 - 根据数量选择渲染方式 */}
      {enableVirtualScroll ? renderVirtualList() : renderNormalList()}
    </div>
  );
}
