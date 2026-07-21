import { Store } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import type { StoreInfo } from "@/types";

export function StoreProperties({ info }: { info: StoreInfo[] }) {
  return (
    <Card>
      <CardHeader title="Store Properties" icon={Store} />
      <div className="space-y-0 divide-y divide-border">
        {info.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-3">
            <span className="text-body text-text-secondary">{item.label}</span>
            <span className="text-body text-text-primary font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
