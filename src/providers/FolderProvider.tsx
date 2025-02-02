import React, { useState, useEffect, useCallback } from "react";
import { Folder, CreateFolderInput, SortOptions } from "#/types";
import {
  getFolders,
  getFolderById,
  createFolder as apiCreateFolder,
  deleteFolder as apiDeleteFolder,
  updateFolder as apiUpdateFolder,
} from "#/api";

export const FolderContext = React.createContext<{
  parentId: string;
  folders: Folder[];
  loading: boolean;
  error: Error | null;
  createFolder: (folderData: CreateFolderInput) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  updateFolder: (id: string, updateData: Partial<Folder>) => Promise<void>;
  loadMoreFolders: () => void;
  refreshFolders: () => Promise<void>;
  hasMoreFolders: boolean;
  fetchSingleFolder: (id: string) => Promise<Folder | null>;
  enterFolder: (folderId: string) => void;
  sortOptions: SortOptions;
  setSortOptions: (
    sortOptions: SortOptions | ((prev: SortOptions) => SortOptions)
  ) => void;
  currentFolderName: string;
}>({
  parentId: "root",
  folders: [],
  loading: false,
  error: null,
  createFolder: async () => {
    throw new Error("Not implemented");
  },
  deleteFolder: async () => {
    throw new Error("Not implemented");
  },
  updateFolder: async () => {
    throw new Error("Not implemented");
  },
  loadMoreFolders: () => {},
  refreshFolders: async () => {},
  hasMoreFolders: true,
  fetchSingleFolder: async () => null,
  enterFolder: () => {},
  sortOptions: {
    field: "name",
    direction: "asc",
  },
  setSortOptions: () => {},
  currentFolderName: "root",
});

// Define the FolderProvider component
export const FolderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: "name",
    direction: "asc",
  });
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [parentId, setParentId] = useState<string>("root");
  const [currentFolderName, setCurrentFolderName] = useState<string>("root");

  const fetchFolders = useCallback(
    async (
      currentLastKey: string | null = null,
      currentSort: SortOptions = sortOptions
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await getFolders(
          parentId,
          currentLastKey,
          currentSort
        );
        const fetchedFolders = Array.isArray(response.folders)
          ? response.folders
          : [];
        const newLastKey = response.lastKey || null;

        if (fetchedFolders.length === 0) {
          setHasMore(false);
        } else {
          if (currentLastKey === null) {
            setFolders(fetchedFolders);
          } else {
            setFolders((prev) => [...prev, ...fetchedFolders]);
          }
          setLastKey(newLastKey);
        }
      } catch (err: any) {
        setError(
          err instanceof Error ? err : new Error("Failed to fetch folders")
        );
      } finally {
        setLoading(false);
      }
    },
    [parentId, sortOptions]
  );

  useEffect(() => {
    setFolders([]);
    setLastKey(null);
    setHasMore(true);
    fetchFolders(null, sortOptions);
  }, [parentId, sortOptions]); // intentionally removed fetchFolders from dependencies

  const loadMoreFolders = useCallback(() => {
    if (hasMore && !loading && !error) {
      fetchFolders(lastKey, sortOptions);
    }
  }, [hasMore, loading, error, fetchFolders, lastKey, sortOptions]);

  const refreshFolders = useCallback(async () => {
    setFolders([]);
    setLastKey(null);
    setHasMore(true);
    fetchFolders(null, sortOptions);
  }, [fetchFolders, sortOptions]);

  const createFolder = useCallback(async (folderData: Partial<Folder>) => {
    try {
      if (!folderData.name) {
        throw new Error("Folder name is required");
      }
      const newFolder = await apiCreateFolder(parentId, folderData.name);
      setFolders((prev) => [newFolder, ...prev]);
      return newFolder;
    } catch (err: any) {
      setError(
        err instanceof Error ? err : new Error("Failed to create folder")
      );
      throw err;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await apiDeleteFolder(id);
      setFolders((prev) => prev.filter((folder) => folder.id !== id));
    } catch (err: any) {
      setError(
        err instanceof Error ? err : new Error("Failed to delete folder")
      );
      throw err;
    }
  }, []);

  const updateFolder = useCallback(
    async (id: string, updateData: Partial<Folder>) => {
      try {
        const updatedFolder = await apiUpdateFolder(id, updateData);
        setFolders((prev) =>
          prev.map((folder) => (folder.id === id ? updatedFolder : folder))
        );
      } catch (err: any) {
        setError(
          err instanceof Error ? err : new Error("Failed to update folder")
        );
        throw err;
      }
    },
    []
  );

  const fetchSingleFolder = useCallback(
    async (id: string): Promise<Folder | null> => {
      try {
        const folder = await getFolderById(id);
        return folder;
      } catch (err) {
        console.error("Error fetching single folder:", err);
        return null;
      }
    },
    []
  );

  const enterFolder = useCallback((folderId: string) => {
    setParentId(folderId);
    async function updateFolderName() {
      const folder = await fetchSingleFolder(folderId);
      setCurrentFolderName(folder?.name || "root");
    }
    updateFolderName();
  }, []);

  return (
    <FolderContext.Provider
      value={{
        parentId,
        folders,
        loading,
        error,
        createFolder,
        deleteFolder,
        updateFolder,
        loadMoreFolders,
        refreshFolders,
        hasMoreFolders: hasMore,
        fetchSingleFolder,
        enterFolder,
        sortOptions,
        setSortOptions,
        currentFolderName,
      }}
    >
      {children}
    </FolderContext.Provider>
  );
};
