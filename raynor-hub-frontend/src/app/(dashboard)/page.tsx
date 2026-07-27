import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Activity, 
  Package, 
  CheckCircle, 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  FileText,
  ChevronRight,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Settings,
  Bell,
  Search
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive overview of your marketplace automation platform
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-primary bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,487</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +12.4% from last month
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-yellow-500 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">42</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-yellow-500" />
                +3.2% from yesterday
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-green-500 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">9,842</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +8.7% from last month
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="border-l-4 border-blue-500 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rp15.25M</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +4.2% from yesterday
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-purple-500 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Bots</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +2 new bots
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-cyan-500 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Automation Status</CardTitle>
              <Clock className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94%</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +1.2% uptime
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-3">
          <Card className="border-l-4 border-orange-500 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Status</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87% Full</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingDown className="h-3 w-3 mr-1 text-yellow-500" />
                -2.3% from last week
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest orders across all marketplaces</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Order ID</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead className="hidden md:table-cell">Items</TableHead>
                      <TableHead className="hidden md:table-cell">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">SH-20260720-08412</TableCell>
                      <TableCell>Itemku</TableCell>
                      <TableCell className="hidden md:table-cell">Robux 150K</TableCell>
                      <TableCell className="hidden md:table-cell">Rp1,250,000</TableCell>
                      <TableCell><Badge variant="default">Processing</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SH-20260720-08411</TableCell>
                      <TableCell>G2G</TableCell>
                      <TableCell className="hidden md:table-cell">Robux 200K</TableCell>
                      <TableCell className="hidden md:table-cell">Rp1,650,000</TableCell>
                      <TableCell><Badge variant="secondary">Completed</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SH-20260720-08410</TableCell>
                      <TableCell>U7Buy</TableCell>
                      <TableCell className="hidden md:table-cell">Robux 100K</TableCell>
                      <TableCell className="hidden md:table-cell">Rp850,000</TableCell>
                      <TableCell><Badge variant="outline">Delivering</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SH-20260720-08409</TableCell>
                      <TableCell>Eldorado</TableCell>
                      <TableCell className="hidden md:table-cell">Robux 250K</TableCell>
                      <TableCell className="hidden md:table-cell">Rp2,050,000</TableCell>
                      <TableCell><Badge variant="default">Processing</Badge></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SH-20260720-08408</TableCell>
                      <TableCell>Itemku</TableCell>
                      <TableCell className="hidden md:table-cell">Robux 300K</TableCell>
                      <TableCell className="hidden md:table-cell">Rp2,450,000</TableCell>
                      <TableCell><Badge variant="secondary">Completed</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">5</span> of <span className="font-medium">124</span> recent orders
                </p>
                <Button variant="outline" size="sm">
                  View All Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Bot Status</CardTitle>
              <CardDescription>Active automation agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Marketplace Monitor</span>
                  </div>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Order Processor</span>
                  </div>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Payment Handler</span>
                  </div>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-medium">Inventory Sync</span>
                  </div>
                  <Badge variant="default">Online</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="font-medium">Delivery Tracker</span>
                  </div>
                  <Badge variant="outline">Degraded</Badge>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Overall Health</div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-green-500 font-medium">Excellent</span>
                  </div>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Marketplace Status & Workflow */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Marketplace Status</CardTitle>
            <CardDescription>Integration health across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium">Itemku</span>
                </div>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium">G2G</span>
                </div>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium">U7Buy</span>
                </div>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="font-medium">Eldorado</span>
                </div>
                <Badge variant="default">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">ShopBack</span>
                </div>
                <Badge variant="outline">Limited</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="font-medium">Eldorado</span>
                </div>
                <Badge variant="outline">Disconnected</Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Uptime (30 days)</div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-500 font-medium">99.8%</span>
                </div>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '99.8%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation Workflow</CardTitle>
            <CardDescription>End-to-end process flow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">1</div>
                <div className="flex-1">
                  <div className="font-medium">Marketplace</div>
                  <div className="text-xs text-muted-foreground">Monitor listings & prices</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">2</div>
                <div className="flex-1">
                  <div className="font-medium">Order</div>
                  <div className="text-xs text-muted-foreground">Process customer orders</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">3</div>
                <div className="flex-1">
                  <div className="font-medium">Payment</div>
                  <div className="text-xs text-muted-foreground">Handle transactions & verification</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">4</div>
                <div className="flex-1">
                  <div className="font-medium">Inventory</div>
                  <div className="text-xs text-muted-foreground">Sync stock levels & availability</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">5</div>
                <div className="flex-1">
                  <div className="font-medium">Automation</div>
                  <div className="text-xs text-muted-foreground">Execute workflows & rules</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">6</div>
                <div className="flex-1">
                  <div className="font-medium">Delivery</div>
                  <div className="text-xs text-muted-foreground">Track shipments & updates</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-xs">7</div>
                <div className="flex-1">
                  <div className="font-medium">Reporting</div>
                  <div className="text-xs text-muted-foreground">Generate analytics & insights</div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Workflow Status</div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-500 font-medium">Running</span>
                </div>
              </div>
              <div className="mt-2 w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '100%'}}></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system events and notifications</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div className="flex-1">
                <div className="font-medium">New order received</div>
                <div className="text-sm text-muted-foreground">RH-20260717-123461 • Itemku • Rp1,250,000</div>
                <div className="text-xs text-muted-foreground mt-1">2 minutes ago</div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div className="flex-1">
                <div className="font-medium">Inventory sync completed</div>
                <div className="text-sm text-muted-foreground">Updated 12 products across 3 marketplaces</div>
                <div className="text-xs text-muted-foreground mt-1">15 minutes ago</div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2"></div>
              <div className="flex-1">
                <div className="font-medium">Automation workflow executed</div>
                <div className="text-sm text-muted-foreground">Price adjustment rule applied to 8 products</div>
                <div className="text-xs text-muted-foreground mt-1">32 minutes ago</div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div className="flex-1">
                <div className="font-medium">Order completed</div>
                <div className="text-sm text-muted-foreground">SH-20260720-08411 • G2G • Rp1,650,000</div>
                <div className="text-xs text-muted-foreground mt-1">1 hour ago</div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div className="flex-1">
                <div className="font-medium">Bot status warning</div>
                <div className="text-sm text-muted-foreground">Delivery Tracker experiencing delays</div>
                <div className="text-xs text-muted-foreground mt-1">2 hours ago</div>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
