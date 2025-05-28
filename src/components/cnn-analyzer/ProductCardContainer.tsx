"use client";

import ProductCard from "./ProductCard";
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function ProductCardContainer() {
  const { productConfigs } = useAppContext();

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md pb-4">
      <div className="flex w-max space-x-4 p-4">
        {productConfigs.map(config => (
          <ProductCard key={config.id} productConfig={config} />
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
