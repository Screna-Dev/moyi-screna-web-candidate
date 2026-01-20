import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Coins, 
  TrendingUp, 
  Upload, 
  Eye, 
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { creditStats, creditTransactions, currentUser } from '@/data/experienceMockData';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  variant = 'default' 
}: { 
  label: string; 
  value: string | number; 
  icon: React.ElementType;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) => {
  const variantStyles = {
    default: 'bg-muted/50',
    primary: 'bg-primary/10 border-primary/20',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    warning: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-orange-600 dark:text-orange-400',
  };

  return (
    <Card className={cn('border', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold">{value}</p>
          </div>
          <div className={cn('p-3 rounded-xl bg-background', variantStyles[variant])}>
            <Icon className={cn('h-6 w-6', iconStyles[variant])} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CreditEarnings = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <Coins className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Credit Earnings</h1>
              <p className="text-muted-foreground text-lg">
                Track what you earned and what you spent.
              </p>
            </div>

            {/* User Tier Badge */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {currentUser.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{currentUser.name}</p>
                      <p className="text-sm text-muted-foreground">Your credits overview</p>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary text-sm px-3 py-1">
                    {currentUser.tier} Tier
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard 
                label="Current Balance" 
                value={creditStats.currentBalance} 
                icon={Coins}
                variant="primary"
              />
              <StatCard 
                label="Earned from Uploads" 
                value={creditStats.earnedFromUploads} 
                icon={Upload}
                variant="success"
              />
              <StatCard 
                label="Earned from Answer Views" 
                value={creditStats.earnedFromAnswerViews} 
                icon={Eye}
                variant="success"
              />
              <StatCard 
                label="Spent on Mocks" 
                value={creditStats.spentOnMocks} 
                icon={Zap}
                variant="warning"
              />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">Total Earned</span>
                  </div>
                  <p className="text-4xl font-bold text-green-700 dark:text-green-300">
                    +{creditStats.earnedFromUploads + creditStats.earnedFromAnswerViews}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    From uploads and community contributions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="font-medium text-orange-700 dark:text-orange-300">Total Spent</span>
                  </div>
                  <p className="text-4xl font-bold text-orange-700 dark:text-orange-300">
                    -{creditStats.spentOnMocks}
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                    On AI mocks and unlocking answers
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditTransactions.map((transaction, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground">
                          {transaction.date}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === 'earned' ? (
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-orange-500" />
                            )}
                            {transaction.action}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            className={cn(
                              "font-mono",
                              transaction.type === 'earned' 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            )}
                          >
                            {transaction.credits}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default CreditEarnings;
