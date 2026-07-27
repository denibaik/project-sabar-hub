import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Download } from "lucide-react";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your digital product inventory
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <span className="text-2xl font-bold">24</span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <span className="text-2xl font-bold text-green-500">18</span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <span className="text-2xl font-bold text-yellow-500">3</span>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <span className="text-2xl font-bold text-red-500">3</span>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center p-4 border rounded-lg">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mr-4">
                <span className="text-muted-foreground">RB</span>
              </div>
              <div>
                <div className="font-medium">Robux 150K</div>
                <div className="text-sm text-muted-foreground">Available: 42 • Reserved: 3</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-medium">42</div>
                <div className="text-sm text-muted-foreground">in stock</div>
              </div>
            </div>
            <div className="flex items-center p-4 border rounded-lg">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center mr-4">
                <span className="text-muted-foreground">RB</span>
              </div>
              <div>
                <div className="font-medium">Robux 200K</div>
                <div className="text-sm text-muted-foreground">Available: 15 • Reserved: 2</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-medium">15</div>
                <div className="text-sm text-muted-foreground">in stock</div>
              </div>
            </div>
            <div className="flex items-center p-4 border rounded-lg border-yellow-200 bg-yellow-50">
              <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center mr-4">
                <span className="text-yellow-700">RB</span>
              </div>
              <div>
                <div className="font-medium">Robux 100K</div>
                <div className="text-sm text-muted-foreground">Available: 2 • Reserved: 1</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-medium text-yellow-600">2</div>
                <div className="text-sm text-yellow-600">low stock</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
