"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPageMetadataFromXml } from "@/app/lib/storage/page-metadata";
import type { DrawioPageInfo } from "@/app/lib/storage/page-metadata";
import { createLogger } from "@/app/lib/logger";

const logger = createLogger("usePageSelection");

export interface UsePageSelectionOptions {
  xml: string | null;
}

export interface UsePageSelectionResult {
  pages: DrawioPageInfo[];
  selectedPageIds: Set<string>;
  setSelectedPageIds: (ids: Set<string>) => void;
  isAllSelected: boolean;
  selectedPageIndices: number[];
  selectAll: () => void;
  togglePage: (pageId: string) => void;
  toggleAll: () => void;
}

function areAllSelected(selectedPageIds: Set<string>, pageIds: Set<string>) {
  if (selectedPageIds.size !== pageIds.size) return false;
  for (const id of pageIds) {
    if (!selectedPageIds.has(id)) return false;
  }
  return true;
}

function areSetsEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function buildIdSet(pages: DrawioPageInfo[]): Set<string> {
  const ids = new Set<string>();
  for (const page of pages) ids.add(page.id);
  return ids;
}

export function usePageSelection(
  options: UsePageSelectionOptions,
): UsePageSelectionResult {
  const pages = useMemo<DrawioPageInfo[]>(() => {
    try {
      return buildPageMetadataFromXml(options.xml).pages;
    } catch (error) {
      logger.error("解析页面元数据失败，回退到默认单页", error);
      return buildPageMetadataFromXml(null).pages;
    }
  }, [options.xml]);

  const pageIdSet = useMemo(() => buildIdSet(pages), [pages]);
  const pageIdList = useMemo(() => Array.from(pageIdSet), [pageIdSet]);

  const [selectedPageIdsInternal, setSelectedPageIdsInternal] = useState<
    Set<string>
  >(() => new Set(pageIdList));

  const prevPageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentPageIds = pageIdSet;
    const prevPageIds = prevPageIdsRef.current;

    const newPageIds: string[] = [];
    for (const id of currentPageIds) {
      if (!prevPageIds.has(id)) newPageIds.push(id);
    }

    setSelectedPageIdsInternal((prevSelected) => {
      const nextSelected = new Set<string>();

      for (const id of prevSelected) {
        if (currentPageIds.has(id)) nextSelected.add(id);
      }

      for (const id of newPageIds) nextSelected.add(id);

      if (nextSelected.size === 0) {
        for (const id of currentPageIds) nextSelected.add(id);
      }

      return areSetsEqual(prevSelected, nextSelected)
        ? prevSelected
        : nextSelected;
    });

    prevPageIdsRef.current = new Set(currentPageIds);
  }, [pageIdSet]);

  const setSelectedPageIds = useCallback(
    (ids: Set<string>) => {
      const validIds = new Set<string>();
      for (const id of ids) {
        if (pageIdSet.has(id)) validIds.add(id);
      }

      if (validIds.size === 0) {
        const fallbackAll = new Set(pageIdSet);
        setSelectedPageIdsInternal((prevSelected) =>
          areSetsEqual(prevSelected, fallbackAll) ? prevSelected : fallbackAll,
        );
        return;
      }

      setSelectedPageIdsInternal((prevSelected) =>
        areSetsEqual(prevSelected, validIds) ? prevSelected : validIds,
      );
    },
    [pageIdSet],
  );

  const selectAll = useCallback(() => {
    setSelectedPageIdsInternal((prevSelected) => {
      const nextSelected = new Set(pageIdSet);
      return areSetsEqual(prevSelected, nextSelected)
        ? prevSelected
        : nextSelected;
    });
  }, [pageIdSet]);

  const togglePage = useCallback(
    (pageId: string) => {
      if (!pageIdSet.has(pageId)) {
        logger.warn("忽略未知 pageId 的切换请求", { pageId });
        return;
      }

      setSelectedPageIdsInternal((prevSelected) => {
        if (prevSelected.has(pageId) && prevSelected.size === 1) {
          return prevSelected;
        }

        const nextSelected = new Set(prevSelected);
        if (nextSelected.has(pageId)) nextSelected.delete(pageId);
        else nextSelected.add(pageId);
        return nextSelected;
      });
    },
    [pageIdSet],
  );

  const isAllSelected = useMemo(
    () => areAllSelected(selectedPageIdsInternal, pageIdSet),
    [pageIdSet, selectedPageIdsInternal],
  );

  const selectedPageIndices = useMemo(() => {
    if (isAllSelected) return [];

    const indices: number[] = [];
    for (const page of pages) {
      if (selectedPageIdsInternal.has(page.id)) indices.push(page.index);
    }

    indices.sort((a, b) => a - b);
    return indices;
  }, [isAllSelected, pages, selectedPageIdsInternal]);

  const toggleAll = useCallback(() => {
    if (isAllSelected) return;
    selectAll();
  }, [isAllSelected, selectAll]);

  return {
    pages,
    selectedPageIds: selectedPageIdsInternal,
    setSelectedPageIds,
    isAllSelected,
    selectedPageIndices,
    selectAll,
    togglePage,
    toggleAll,
  };
}
