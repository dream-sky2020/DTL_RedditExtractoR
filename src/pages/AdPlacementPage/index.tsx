import { AdPlacementView } from './AdPlacementView';
import { useAdPlacement } from './hooks/useAdPlacement';

export const AdPlacementPage = () => {
  const model = useAdPlacement();
  return <AdPlacementView {...model} />;
};
