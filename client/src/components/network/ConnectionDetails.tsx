import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NetworkCenter, NetworkNode, riskBucketColors } from "./types";
import { X } from "lucide-react";

interface ConnectionDetailsProps {
  node: NetworkNode;
  centerNode: NetworkCenter;
  onClose: () => void;
}

export function ConnectionDetails({ node, centerNode, onClose }: ConnectionDetailsProps) {
  return (
    <Card className="absolute top-4 right-4 w-[320px] shadow-lg z-10">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Connection Details</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <h4 className="font-semibold">{node.name}</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {node.relationshipType}
            </Badge>
            <Badge 
              variant={node.relationshipStatus === 'ACTIVE' ? 'default' : 'secondary'} 
              className="text-xs"
            >
              {node.relationshipStatus}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Risk Score</p>
            <div className="flex items-center mt-1 gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: riskBucketColors[node.riskBucket] }}
              />
              <p className="font-medium">{node.riskScore}/1500</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accreditation</p>
            <p className="font-medium">{node.accreditationStatus.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Revenue Tier</p>
            <p className="font-medium">{node.revenueTier || 'Not Specified'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="font-medium">{node.category || 'Not Specified'}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <h5 className="font-semibold text-xs text-muted-foreground mb-2">
            Relationship with {centerNode.name}
          </h5>
          <p className="text-xs">
            {node.name} is a {node.relationshipType.toLowerCase()} for {centerNode.name} and has
            a {node.riskBucket} risk profile.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}