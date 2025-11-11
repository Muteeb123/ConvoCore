import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { FALLBACK_URL } from "@/constants/data";
import { Switch } from "@/components/ui/switch";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  userType: "associate" | "manager" | "team-lead" | "admin"; // passed from tab
}

export function UserModal({
  isOpen,
  onClose,
  user: userToEdit,
  userType,
}: UserModalProps) {
  console.log(`The user is ${JSON.stringify(userToEdit)}`);
  const { toast } = useToast();
  const isEditing = !!userToEdit;
  const [modifyRole, setModifyRole] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const fallbackUrl = FALLBACK_URL;
  const [profilePicUrl, setProfilePicUrl] = useState<any>(fallbackUrl);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const requiredUserSchema = insertUserSchema.extend({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Invalid email").min(1, "Email is required"),
    roleId: z.coerce.number().nullable().optional(),
    password: z.string().min(1, "Password is required"),
    // password: z
    //   .string()
    //   .optional()
    //   .or(z.literal("")) // allow empty string
    //   .refine((val) => val === "" || val!.length >= 6, {
    //     message: "Password must be at least 6 characters",
    //   }),
    userType: z.enum(["associate", "manager", "team-lead", "admin"]),
    isEmailNotification: z.boolean().optional(),
  });

  type UserFormData = z.infer<typeof requiredUserSchema>;

  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch(`/api/roles`);
      if (!res.ok) throw new Error("Failed to fetch roles");
      const roles = await res.json();
      return roles;
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(`/api/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(requiredUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      roleId: undefined,
      isActive: true,
      password: "",
      userType: userType,
      isEmailNotification: false,
    },
  });
  useEffect(() => {
    // Only reset if modal is open AND roles have finished loading
    if (isOpen && !rolesLoading && roles) {
      if (userToEdit) {
        form.reset({
          username: userToEdit.username,
          email: userToEdit.email,
          firstName: userToEdit.firstName,
          lastName: userToEdit.lastName,
          roleId: userToEdit.roleId ?? null, // Use null
          isActive: userToEdit.isActive,
          password: userToEdit.password,
          userType: userToEdit.userType ?? undefined,
          isEmailNotification: userToEdit.isEmailNotification ?? false,
        });
        setProfilePicUrl(userToEdit.avatar || fallbackUrl);
        setProfilePicture(null);
      } else {
        form.reset({
          username: "",
          email: "",
          firstName: "",
          lastName: "",
          roleId: null, // Use null
          isActive: true,
          password: "",
          userType: userType,
          isEmailNotification: false,
        });
        setProfilePicUrl(fallbackUrl);
        setProfilePicture(null);
      }
    }
  }, [
    isOpen,
    userToEdit,
    userType,
    form.reset, // Correct dependency
    roles, // Add roles
    rolesLoading, // Add rolesLoading
  ]);
  // useEffect(() => {

  //   if (userToEdit != null) {

  //     // console.log(`The user is ${JSON.stringify(userToEdit)}`)
  //     form.reset({
  //       username: userToEdit.username,
  //       email: userToEdit.email,
  //       firstName: userToEdit.firstName,
  //       lastName: userToEdit.lastName,
  //       roleId: userToEdit.roleId || null,
  //       isActive: userToEdit.isActive,
  //       // password: "",
  //       password: userToEdit.password,
  //       userType: userToEdit.userType ?? undefined,
  //     });
  //     console.log('the user to edit is :', userToEdit, 'with profile url :', userToEdit.avatar)
  //     setProfilePicUrl(userToEdit.avatar);
  //   } else {
  //     setProfilePicUrl(fallbackUrl);
  //     form.reset({
  //       username: "",
  //       email: "",
  //       firstName: "",
  //       lastName: "",
  //       roleId: undefined,
  //       isActive: true,
  //       password: "",
  //       userType: userType
  //     });
  //   }
  // }, [userToEdit, userType, form]);

  const selectedUserType = form.watch("userType");

  useEffect(() => {
    if (isEditing) {
      if (selectedUserType === "associate") {
        // Clear roleId completely when switching to associate
        form.setValue("roleId", null, { shouldValidate: true });
        setModifyRole(false);
      } else {
        setModifyRole(true);
      }
    }
  }, [selectedUserType, isEditing, form]);

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      // Check uniqueness
      const usernameExists = users.some(
        (user) => user.username === data.username
      );
      if (usernameExists) throw new Error("Username already exists");

      const emailExists = users.some((user) => user.email === data.email);
      if (emailExists) throw new Error("Email already exists");

      const sanitizedData = sanitize(data);
      const res = await apiRequest("POST", `/api/user`, sanitizedData);
      if (!res.ok) throw new Error("Error creating user");
      const user = await res.json();
      console.log("the res user  is : ", user);
      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);
        const uploadRes = await fetch(`/api/users/${user.id}/avatar`, {
          method: "PUT",
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error("failed to upload user avatar");
        }
        const updatedUser = await uploadRes.json();
        return updatedUser;
      }
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });

      toast({
        title: "User added successfully with default password integriti@123",
        variant: "default",
      });
      form.reset();
      onClose();
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (!userToEdit) throw new Error("No user to update");

      // Validate uniqueness (skip if same username/email)
      if (data.username !== userToEdit.username) {
        const usernameExists = users.some((u) => u.username === data.username);
        if (usernameExists) throw new Error("Username already exists");
      }

      if (data.email !== userToEdit.email) {
        const emailExists = users.some((u) => u.email === data.email);
        if (emailExists) throw new Error("Email already exists");
      }

      const sanitizedData = sanitize(data);
      const updateRes = await apiRequest("PUT", `/api/users/${userToEdit.id}`, {
        ...sanitizedData,
        updatedAt: new Date().toISOString(),
      });
      if (!updateRes.ok) throw new Error("error updating user from db");
      const user = await updateRes.json();
      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);
        const updateAvatarRes = await fetch(`/api/users/${user.id}/avatar`, {
          method: "PUT",
          body: formData,
        });
        if (!updateAvatarRes.ok)
          throw new Error("error updating avatar for the user");
        const updatedUser = await updateAvatarRes.json();
        return updatedUser;
      }
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["myTeams"] });
      toast({
        title: "User updated successfully!",
        variant: "default",
      });
      onClose();
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const sanitize = (data: UserFormData): UserFormData => {
    const sanitizedData: UserFormData = {
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      firstName: data.firstName?.trim() || "",
      lastName: data.lastName?.trim() || "",
      roleId: data.userType === "associate" ? null : data.roleId,
      isActive: data.isActive,
      password: data.password,
      userType: data.userType,
      avatar: profilePicUrl,
      isEmailNotification: data.isEmailNotification,
    };

    return sanitizedData;
  };

  // const handleSubmit = async (data: UserFormData) => {
  //   const isValid = await form.trigger();
  //   if (!isValid) {
  //     return;
  //   }

  //   try {
  //     await mutation.mutateAsync(sanitize(data));
  //   } catch (error) {
  //     console.log('Error while submitting user form: ', error)
  //     // Error handling is done in mutation.onError
  //   }
  // };
  const handleSubmit = async (data: UserFormData) => {
    // Prevent submission if no role selected
    try {
      if (!data.roleId) {
        form.setError("roleId", {
          type: "manual",
          message: "Role is required",
        });
        return;
      }
      const sanitized = sanitize(data);
      if (userToEdit) {
        await updateUserMutation.mutateAsync(sanitized);
      } else {
        await createUserMutation.mutateAsync(sanitized);
      }
    } catch (err) {
      console.error("Error during submission:", err);
    }
    // const sanitized = sanitize(data);
    // if (userToEdit) {
    //   await updateUserMutation.mutateAsync(sanitized);
    // } else {
    //   await createUserMutation.mutateAsync(sanitized);
    // }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{userToEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            Fill in the details below. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-2 flex justify-center">
            <div>
              {/* Profile Preview with Edit Button */}
              <div className="relative group">
                <img
                  src={
                    profilePicture
                      ? URL.createObjectURL(profilePicture)
                      : profilePicUrl
                      ? profilePicUrl
                      : fallbackUrl
                  }
                  alt="user avatar"
                  className="w-20 h-20 rounded-full object-cover shadow-sm border"
                />

                <button
                  type="button"
                  onClick={() =>
                    document.getElementById("profilePicInput")?.click()
                  }
                  className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center shadow-lg transition-colors border-2 border-white"
                  aria-label="Edit profile picture"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Hidden inputs */}
            <input
              id="profilePicInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setProfilePicture(e.target.files[0]);
                }
              }}
            />
            <input
              id="cameraInputProfile"
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setProfilePicture(e.target.files[0]);
                }
              }}
            />
          </div>
          <div>
            <Label htmlFor="username">Username *</Label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-sm text-red-500">
                {form.formState.errors.username.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-sm text-red-500">
                {form.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="text-sm text-red-500">
                {form.formState.errors.lastName.message}
              </p>
            )}
          </div>

          <div className="relative">
            <Label htmlFor="password">Password *</Label>
            {isEditing && (
              <p className="text-sm text-gray-500 italic">
                leave black to keep current password
              </p>
            )}
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                {...form.register("password")}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-red-500">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          {isEditing && (
            <div>
              <Label htmlFor="userType">User Type *</Label>
              <Select
                value={form.watch("userType")}
                onValueChange={(val) => {
                  form.setValue(
                    "userType",
                    val as "associate" | "manager" | "team-lead" | "admin",
                    {
                      shouldValidate: true,
                    }
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="associate">Associate</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team-lead">Team Lead</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.userType && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.userType.message}
                </p>
              )}
            </div>
          )}
          {((isEditing && modifyRole) ||
            (!isEditing && userType !== "associate")) && (
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                value={
                  form.watch("roleId") !== null &&
                  form.watch("roleId") !== undefined
                    ? String(form.watch("roleId"))
                    : ""
                }
                onValueChange={(val) => {
                  const parsed = val === "" ? null : parseInt(val);
                  form.setValue("roleId", parsed, { shouldValidate: true });
                }}
                // disabled={rolesLoading} // You can keep or remove this
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {rolesLoading && (
                    <SelectItem value="" disabled>
                      Loading...
                    </SelectItem>
                  )}
                  {rolesError && (
                    <SelectItem value="" disabled>
                      Error loading roles
                    </SelectItem>
                  )}
                  {roles
                    ?.filter((role: any) => {
                      const type = isEditing ? selectedUserType : userType;
                      if (isEditing && userToEdit?.roleId === role.id)
                        return true; // Always include current role
                      if (type === "manager")
                        return role.roleType === "manager";
                      if (type === "team-lead")
                        return role.roleType === "team-lead";
                      if (type === "admin") return role.roleType === "admin";
                      return false;
                    })
                    .map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  {/* {roles
                    ?.filter((role: any) => {
                      const type = isEditing ? selectedUserType : userType;
                      if (type === "manager") return role.roleType === "manager";
                      if (type === "team-lead") return role.roleType === "team-lead";
                      if (type === "admin") return role.roleType === "admin";
                      return false;
                    })
                    .map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))} */}
                </SelectContent>
              </Select>
              {form.formState.errors.roleId && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.roleId.message}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={!!form.watch("isActive")}
              onCheckedChange={(checked) => {
                form.setValue("isActive", !!checked);
              }}
            />
            <Label htmlFor="isActive">Active User</Label>
          </div>

          {/* --- ADD THIS NEW BLOCK (replaces the FormField) --- */}
          <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
            <div className="space-y-0.5">
              <Label htmlFor="isEmailNotification">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Allow the system to send email notifications to this user.
              </p>
            </div>
            <Switch
              id="isEmailNotification"
              checked={!!form.watch("isEmailNotification")}
              onCheckedChange={(checked) => {
                form.setValue("isEmailNotification", !!checked, {
                  shouldDirty: true,
                });
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createUserMutation.isPending || updateUserMutation.isPending
              }
            >
              {userToEdit
                ? updateUserMutation.isPending
                  ? "Updating..."
                  : "Update"
                : createUserMutation.isPending
                ? "Adding"
                : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
