import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";

const types = ["text"] as const;
const states = ["default", "disabled", "active", "successful", "error", "ai-suggestion"] as const;

export default function FormFieldPlayground() {
  const [type, setType] = useState<typeof types[number]>("text");
  const [state, setState] = useState<typeof states[number]>("default");

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Form Field Component</h1>
      
      <Card className="p-6">
        <div className="flex gap-4 mb-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Type</label>
            <Select 
              value={type} 
              onValueChange={(value) => setType(value as typeof types[number])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">State</label>
            <Select 
              value={state} 
              onValueChange={(value) => setState(value as typeof states[number])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full max-w-md">
          <FormField
            type={type}
            variant={state}
            placeholder="Enter some text..."
            aiSuggestion={state === 'ai-suggestion' ? "LLC" : undefined}
          />
        </div>
      </Card>
    </div>
  );
}
