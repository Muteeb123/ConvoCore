import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export function SalesPipeline() {
  const { data: pipeline = [], isLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/sales-pipeline"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case "prospecting":
        return "bg-primary";
      case "qualification":
        return "bg-secondary";
      case "proposal":
        return "bg-warning";
      case "negotiation":
        return "bg-red-500";
      case "closed":
        return "bg-success";
      default:
        return "bg-gray-500";
    }
  };

  const getStageProgress = (index: number, total: number) => {
    return ((total - index) / total) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pipeline.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No pipeline data available
          </div>
        ) : (
          pipeline.map((stage, index) => (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 capitalize">{stage.stage}</span>
                <span className="text-sm font-medium text-gray-900">
                  ${stage.value.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={getStageProgress(index, pipeline.length)} 
                className="h-2"
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
