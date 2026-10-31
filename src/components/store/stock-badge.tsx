import { Badge } from "@/components/ui/badge";
import { stockLevel } from "@/lib/format";

export function StockBadge({ stock, className }: { stock: number | null; className?: string }) {
  switch (stockLevel(stock)) {
    case "out":
      return (
        <Badge tone="danger" dot className={className}>
          Sold out
        </Badge>
      );
    case "low":
      return (
        <Badge tone="warn" dot className={className}>
          Only {stock} left
        </Badge>
      );
    default:
      return (
        <Badge tone="success" dot className={className}>
          In stock
        </Badge>
      );
  }
}
