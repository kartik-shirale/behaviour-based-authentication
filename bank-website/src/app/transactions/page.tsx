"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import Link from "next/link";
import { addTransaction, subscribeToAllTransactions } from "@/services/firebase";
import { toast } from "sonner";
import { Transaction } from "../../../data-testing";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fromMobile, setFromMobile] = useState("");
  const [toMobile, setToMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("transfer");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAllTransactions((transactions) => {
      setTransactions(transactions);
    });

    return () => unsubscribe();
  }, []);

  const createSampleTransaction = async () => {
    if (!fromMobile.trim() || !toMobile.trim() || !amount.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsCreating(true);
    try {
      const sampleTransaction: Omit<Transaction, "id" | "createdAt" | "updatedAt"> = {
        amount: amountNum,
        category,
        description: description || `${category} transaction`,
        fromMobile: fromMobile.trim(),
        fromUserId: `user_${fromMobile.trim()}`,
        note: `Sample transaction - ${category}`,
        reference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        status: Math.random() > 0.1 ? "completed" : (Math.random() > 0.5 ? "pending" : "failed"),
        toMobile: toMobile.trim(),
        toUserId: `user_${toMobile.trim()}`,
        type: "debit"
      };

      await addTransaction(sampleTransaction);
      toast.success("Sample transaction created successfully!");
      
      // Reset form
      setFromMobile("");
      setToMobile("");
      setAmount("");
      setDescription("");
    } catch (error) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const generateBulkTransactions = async () => {
    setIsGeneratingBulk(true);
    try {
      const categories = ["transfer", "payment", "deposit", "withdrawal", "bill_pay", "shopping", "food", "transport"];
      const statuses = ["completed", "completed", "completed", "pending", "failed"]; // More completed transactions
      const mobileNumbers = [
        "9876543210", "9876543211", "9876543212", "9876543213", "9876543214",
        "9876543215", "9876543216", "9876543217", "9876543218", "9876543219"
      ];

      const promises = [];
      
      // Generate transactions for the last 30 days
      for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        const fromMobile = mobileNumbers[Math.floor(Math.random() * mobileNumbers.length)];
        const toMobile = mobileNumbers[Math.floor(Math.random() * mobileNumbers.length)];
        const selectedCategory = categories[Math.floor(Math.random() * categories.length)];
        const selectedStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        const transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt"> = {
          amount: Math.floor(Math.random() * 10000) + 100, // ₹100 to ₹10,100
          category: selectedCategory,
          description: `${selectedCategory} transaction`,
          fromMobile,
          fromUserId: `user_${fromMobile}`,
          note: `Bulk generated transaction - ${selectedCategory}`,
          reference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          status: selectedStatus as "pending" | "completed" | "failed" | "cancelled",
          toMobile,
          toUserId: `user_${toMobile}`,
          type: Math.random() > 0.5 ? "debit" : "credit"
        };

        // Add a small delay to avoid overwhelming the database
        promises.push(
          new Promise(resolve => 
            setTimeout(() => addTransaction(transaction).then(resolve), i * 100)
          )
        );
      }

      await Promise.all(promises);
      toast.success("50 sample transactions generated successfully!");
    } catch (error) {
      console.error("Error generating bulk transactions:", error);
      toast.error("Failed to generate bulk transactions. Please try again.");
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Transaction Testing</h1>
          <p className="text-gray-600">Create sample transactions for testing the admin dashboard</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Create Sample Transaction</span>
            </CardTitle>
            <CardDescription>
              Generate individual test transactions with custom parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromMobile">From Mobile Number</Label>
                <Input
                  id="fromMobile"
                  placeholder="9876543210"
                  value={fromMobile}
                  onChange={(e) => setFromMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toMobile">To Mobile Number</Label>
                <Input
                  id="toMobile"
                  placeholder="9876543211"
                  value={toMobile}
                  onChange={(e) => setToMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="bill_pay">Bill Payment</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="food">Food & Dining</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Transaction description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button 
              onClick={createSampleTransaction} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? "Creating..." : "Create Sample Transaction"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Bulk Generation</span>
              </CardTitle>
              <CardDescription>
                Generate multiple transactions for testing charts and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={generateBulkTransactions} 
                disabled={isGeneratingBulk}
                className="w-full"
                variant="outline"
              >
                {isGeneratingBulk ? "Generating..." : "Generate 50 Sample Transactions"}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                This will create 50 random transactions across the last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Current Stats</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Transactions:</span>
                  <span className="font-medium">{transactions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Volume:</span>
                  <span className="font-medium">
                    ₹{transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completed:</span>
                  <span className="font-medium text-green-600">
                    {transactions.filter(t => t.status === "completed").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending:</span>
                  <span className="font-medium text-yellow-600">
                    {transactions.filter(t => t.status === "pending").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Failed:</span>
                  <span className="font-medium text-red-600">
                    {transactions.filter(t => t.status === "failed").length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}