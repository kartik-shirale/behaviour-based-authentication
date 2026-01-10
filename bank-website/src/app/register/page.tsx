"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, UserPlus, User, CreditCard } from "lucide-react";
import Link from "next/link";
import { addUser } from "@/services/firebase";
import { useStore } from "@/store/useStore";
import { toast } from "sonner";

const userSchema = z.object({
  mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  emailId: z.string().email("Invalid email address"),
  age: z.number().min(18, "Age must be at least 18").max(100, "Age must be less than 100"),
  gender: z.enum(["male", "female"]),
  profile: z.string().optional(),
  bankName: z.string().min(2, "Bank name is required"),
  accountNumber: z.string().min(8, "Account number must be at least 8 digits"),
  ifscCode: z.string().min(11, "IFSC code must be 11 characters").max(11, "IFSC code must be 11 characters"),
  branchName: z.string().min(2, "Branch name is required"),
  accountType: z.enum(["savings", "current"]),
  balance: z.number().min(0, "Balance cannot be negative"),
});

type UserFormData = z.infer<typeof userSchema>;

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { addUser: addUserToStore } = useStore();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: "",
      mobile: "",
      emailId: "",
      age: 18,
      gender: undefined,
      profile: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      branchName: "",
      accountType: undefined,
      balance: 0,
    },
  });

  const onSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      const userData = {
        mobile: data.mobile,
        fullName: data.fullName,
        emailId: data.emailId,
        age: data.age,
        gender: data.gender,
        profile: data.profile || null,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        branchName: data.branchName,
        accountType: data.accountType,
        balance: data.balance,
      };

      const userId = await addUser(userData);
      toast.success("User registered successfully!");
      router.push("/");
    } catch (error) {
      console.error("Error registering user:", error);
      toast.error("Failed to register user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="space-y-8">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">User Registration</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create a new user account with personal and banking information for fraud detection analysis
            </p>
          </div>

          <Form {...form}>
             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Basic personal details for user identification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+919876543210" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emailId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Enter age" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="profile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/profile.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Banking Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    Banking Information
                  </CardTitle>
                  <CardDescription>
                    Financial account details for transaction monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter bank name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter account number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="ifscCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IFSC Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter IFSC code" maxLength={11} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="branchName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter branch name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="accountType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="savings">Savings Account</SelectItem>
                              <SelectItem value="current">Current Account</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Balance</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="Enter account balance" 
                              {...field} 
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button type="submit" disabled={isSubmitting} className="flex-1 h-12">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register User
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push("/")} className="h-12">
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}