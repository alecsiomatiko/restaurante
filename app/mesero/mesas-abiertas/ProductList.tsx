import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function ProductList({ category, selected, setSelected }: {
  category: string;
  selected: any[];
  setSelected: (p: any[]) => void;
}) {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!category) return;
    fetch(`/api/products-mysql?category=${encodeURIComponent(category)}`)
      .then(res => res.json())
      .then(data => setProducts(data.products || []));
  }, [category]);

  const addProduct = (product: any) => {
    const exists = selected.find((p) => p.id === product.id);
    if (exists) {
      setSelected(selected.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelected([...selected, { ...product, quantity: 1 }]);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {products.map(product => (
          <div key={product.id} className="rounded-xl bg-white shadow p-3 flex flex-col items-center border border-gray-200">
            <div className="font-bold text-gray-900 text-center mb-1">{product.name}</div>
            <div className="text-sm text-gray-700 mb-2">${Number(product.price).toFixed(2)}</div>
            <Button size="sm" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded" onClick={() => addProduct(product)}>
              Agregar
            </Button>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-4 bg-yellow-50 rounded-lg p-2">
          <div className="font-semibold mb-2 text-yellow-800">Productos seleccionados:</div>
          <ul className="text-yellow-900">
            {selected.map(p => (
              <li key={p.id}>{p.name} x {p.quantity}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
