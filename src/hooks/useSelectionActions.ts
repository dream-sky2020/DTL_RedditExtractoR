import { VideoConfig } from '../types';
import { toast } from '@components/Toast';

interface UseSelectionActionsProps {
  draftConfig: VideoConfig;
  setSelectedSceneIds: (ids: string[]) => void;
  galleryPage?: number;
  galleryPageSize?: number;
}

export const useSelectionActions = ({
  draftConfig,
  setSelectedSceneIds,
  galleryPage,
  galleryPageSize,
}: UseSelectionActionsProps) => {
  const handleSelectAll = () => {
    setSelectedSceneIds(draftConfig.scenes.map(s => s.id));
    toast.success(`已全选 ${draftConfig.scenes.length} 个场景`);
  };

  const handleSelectCurrentPage = () => {
    if (galleryPage === undefined || galleryPageSize === undefined) {
      handleSelectAll();
      return;
    }
    const startIndex = (galleryPage - 1) * galleryPageSize;
    const currentPageScenes = draftConfig.scenes.slice(startIndex, startIndex + galleryPageSize);
    setSelectedSceneIds(currentPageScenes.map(s => s.id));
    toast.success(`已全选当前页面 ${currentPageScenes.length} 个场景`);
  };

  return {
    handleSelectAll,
    handleSelectCurrentPage,
  };
};
