import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NetworkCenter, NetworkNode, riskBucketColors } from "./types";
import { X } from "lucide-react";

interface ConnectionDetailsProps {
  node: NetworkNode;
  centerNode: NetworkCenter;
  onClose: () => void;
  position?: { x: number, y: number } | null;
}

export function ConnectionDetails({ node, centerNode, onClose, position }: ConnectionDetailsProps) {
  // Determine position based on the x-coordinate
  // If the node is on the left side (x < 250), position the panel on the right
  // If the node is on the right side (x >= 250), position the panel on the left
  const positioning = position?.x && position.x < 250 
    ? "right-4" // Node is on the left side, position panel on the right
    : "left-4"; // Node is on the right side, position panel on the left
    
  return (
    <Card className={`absolute top-4 ${positioning} w-[320px] shadow-lg z-10`}>
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
            <p className="font-medium">{node.revenueTier || 'Enterprise'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Category</p>
            <p className="font-medium">{node.category || 'Not Specified'}</p>
          </div>
          
          {/* Only show Consents section for FinTech companies */}
          {node.category === 'FinTech' && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Consents</p>
                <p className="font-medium">
                  {formatConsentsNumber(getActiveConsents(node))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Denied</p>
                <p className="font-medium">
                  {formatConsentsNumber(getDeniedConsents(node))}
                </p>
              </div>
            </>
          )}
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