import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getShipmentStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    received_from_supplier: "#FFC000",
    processing: "#EE0000",
    in_transit: "#EE0000",
    customs: "#00B0F0",
    received_muscat_wh: "#00B050",
    out_for_delivery: "#00B050",
    delivered: "#00B050",
  };
  return colorMap[status] || "#666666";
}

export function getPaymentStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" {
  switch (status) {
    case 'paid':
      return 'default'; // green - success variant
    case 'processed':
      return 'secondary'; // blue
    case 'unpaid':
    default:
      return 'destructive'; // red
  }
}

export function getPaymentStatusLabel(status: string): string {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'processed':
      return 'Processed';
    case 'unpaid':
    default:
      return 'Not Paid';
  }
}

export function getPaymentStatusClassName(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    case 'processed':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    case 'unpaid':
    default:
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
  }
}
