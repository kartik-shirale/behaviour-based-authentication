"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
    UserPlus,
    User,
    CreditCard,
    Loader2,
    Phone,
    Mail,
    Calendar,
    Users,
    Image,
    Building2,
    Hash,
    MapPin,
    Wallet,
    IndianRupee,
    Landmark
} from "lucide-react";
import { addUser } from "@/services/firebase";
import { toast } from "sonner";

// Constants for auto-generated values
const BANK_NAME = "Sentinel Bank";
const IFSC_CODE = "SENT0001234";
const BRANCH_NAME = "Sentinel Digital Branch";
const INITIAL_BALANCE = 10000;

// Generate random 12-digit account number
function generateAccountNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `${timestamp}${random}`;
}

const userSchema = z.object({
    mobile: z.string().min(10, "Mobile number must be at least 10 digits"),
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    emailId: z.string().email("Invalid email address"),
    age: z.number().min(18, "Age must be at least 18").max(100, "Age must be less than 100"),
    gender: z.enum(["male", "female"]),
    profile: z.string().optional(),
    accountType: z.enum(["savings", "current"]),
});

type UserFormData = z.infer<typeof userSchema>;

export default function AdminRegisterPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [accountNumber, setAccountNumber] = useState("");
    const router = useRouter();

    useEffect(() => {
        setAccountNumber(generateAccountNumber());
    }, []);

    const form = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            fullName: "",
            mobile: "",
            emailId: "",
            age: 18,
            gender: undefined,
            profile: "",
            accountType: undefined,
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
                bankName: BANK_NAME,
                accountNumber: accountNumber,
                ifscCode: IFSC_CODE,
                branchName: BRANCH_NAME,
                accountType: data.accountType,
                balance: INITIAL_BALANCE,
            };

            await addUser(userData);
            toast.success("User registered successfully!");
            form.reset();
            setAccountNumber(generateAccountNumber()); // Generate new account number for next user
            router.push("/admin/users");
        } catch (error) {
            console.error("Error registering user:", error);
            toast.error("Failed to register user. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                    <UserPlus className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Register New User</h1>
                    <p className="text-sm text-muted-foreground">
                        Add a new user to Sentinel Bank with auto-generated account details
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Personal Information */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5 text-primary" />
                                Personal Information
                            </CardTitle>
                            <CardDescription>
                                Enter the user's personal details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-10" placeholder="Enter full name" {...field} />
                                                </div>
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
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-10" placeholder="+91 9876543210" {...field} />
                                                </div>
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
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-10" type="email" placeholder="user@example.com" {...field} />
                                                </div>
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
                                                <div className="relative">
                                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        className="pl-10"
                                                        type="number"
                                                        placeholder="Enter age"
                                                        {...field}
                                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                                    />
                                                </div>
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
                                                    <div className="relative">
                                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                                        <SelectTrigger className="pl-10">
                                                            <SelectValue placeholder="Select gender" />
                                                        </SelectTrigger>
                                                    </div>
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
                                <FormField
                                    control={form.control}
                                    name="profile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Profile Image URL (Optional)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input className="pl-10" placeholder="https://example.com/photo.jpg" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Banking Information */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Banking Information
                            </CardTitle>
                            <CardDescription>
                                Account details are auto-generated for Sentinel Bank
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Auto-generated fields (read-only display) */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Bank Name</label>
                                    <div className="relative">
                                        <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10 bg-muted/50"
                                            value={BANK_NAME}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Account Number</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10 bg-muted/50 font-mono"
                                            value={accountNumber}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">IFSC Code</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10 bg-muted/50 font-mono"
                                            value={IFSC_CODE}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Branch Name</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10 bg-muted/50"
                                            value={BRANCH_NAME}
                                            disabled
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* User-selectable fields */}
                            <div className="grid md:grid-cols-2 gap-4 pt-2">
                                <FormField
                                    control={form.control}
                                    name="accountType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Account Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                                                        <SelectTrigger className="pl-10">
                                                            <SelectValue placeholder="Select account type" />
                                                        </SelectTrigger>
                                                    </div>
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
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Initial Balance</label>
                                    <div className="relative">
                                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-10 bg-muted/50 font-semibold text-primary"
                                            value={`₹ ${INITIAL_BALANCE.toLocaleString('en-IN')}`}
                                            disabled
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Welcome bonus credited automatically</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Form Actions */}
                    <div className="flex gap-4">
                        <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Register User
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset();
                                setAccountNumber(generateAccountNumber());
                            }}
                        >
                            Reset Form
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
