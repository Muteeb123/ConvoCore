import { AnalyticsContent } from "./analytics";

const AnalyticsComparison = () => {
  return (
    <AnalyticsContent 
      queryKeyPrefix="comparison" 
      showInGrid={false} 
    />
  );
};

export default AnalyticsComparison;