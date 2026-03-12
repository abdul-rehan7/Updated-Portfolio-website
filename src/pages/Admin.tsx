import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, LogOut, ExternalLink, Inbox, Mail, MailOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Session } from "@supabase/supabase-js";

const PROJECT_IMAGES_BUCKET = "project-images";
const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string;
  live_url: string | null;
  github_url: string | null;
  tags: string[];
  display_order: number;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

const emptyProject = {
  title: "",
  description: "",
  image_url: "",
  live_url: "",
  github_url: "",
  tags: "",
  display_order: 0,
};

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteInquiryId, setDeleteInquiryId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const extractStoragePathFromUrl = (url: string) => {
    const marker = `/storage/v1/object/public/${PROJECT_IMAGES_BUCKET}/`;
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.slice(markerIndex + marker.length));
  };

  const uploadProjectImage = async (file: File) => {
    if (!session?.user) {
      throw new Error("You must be logged in to upload images.");
    }

    if (!file.type.startsWith("image/")) {
      throw new Error("Please select an image file.");
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new Error("Image must be 5MB or smaller.");
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PROJECT_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(PROJECT_IMAGES_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      navigate("/login");
    }
  }, [loading, session, navigate]);

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!session,
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Inquiry[];
    },
    enabled: !!session,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsUploadingImage(true);

      let imageUrl = form.image_url;
      let oldImagePathToDelete: string | null = null;

      if (selectedImageFile) {
        const uploadedUrl = await uploadProjectImage(selectedImageFile);
        oldImagePathToDelete = editingProject ? extractStoragePathFromUrl(form.image_url) : null;
        imageUrl = uploadedUrl;
      }

      const payload = {
        title: form.title,
        description: form.description,
        image_url: imageUrl,
        live_url: form.live_url || null,
        github_url: form.github_url || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        display_order: form.display_order,
      };

      if (editingProject) {
        const { error } = await supabase
          .from("projects")
          .update(payload)
          .eq("id", editingProject);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert([payload]);
        if (error) throw error;
      }

      if (oldImagePathToDelete) {
        const { error } = await supabase.storage
          .from(PROJECT_IMAGES_BUCKET)
          .remove([oldImagePathToDelete]);

        // Deleting old files is best-effort and should not block successful updates.
        if (error) {
          console.warn("Failed to remove previous project image:", error.message);
        }
      }
    },
    onSettled: () => {
      setIsUploadingImage(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDialogOpen(false);
      setEditingProject(null);
      setForm(emptyProject);
      setSelectedImageFile(null);
      toast({ title: editingProject ? "Project updated" : "Project created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteId(null);
      toast({ title: "Project deleted" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_inquiries")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
    },
  });

  const deleteInquiryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_inquiries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inquiries"] });
      setDeleteInquiryId(null);
      toast({ title: "Inquiry deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (project: Project) => {
    setEditingProject(project.id);
    setSelectedImageFile(null);
    setForm({
      title: project.title,
      description: project.description,
      image_url: project.image_url,
      live_url: project.live_url || "",
      github_url: project.github_url || "",
      tags: project.tags.join(", "),
      display_order: project.display_order,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingProject(null);
    setSelectedImageFile(null);
    setForm(emptyProject);
    setDialogOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const unreadCount = inquiries.filter((i) => !i.is_read).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Tabs defaultValue="projects">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="inquiries" className="flex items-center gap-2">
              Inquiries
              {unreadCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" />
                Add Project
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              <AnimatePresence>
                {projects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
                  >
                    {project.image_url && (
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="h-14 w-20 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{project.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{project.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {project.live_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={project.live_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(project)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(project.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="inquiries" className="mt-6">
            {inquiries.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No inquiries yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inquiry) => (
                  <motion.div
                    key={inquiry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`rounded-xl border border-border p-4 ${
                      !inquiry.is_read ? "bg-accent/50" : "bg-card"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {inquiry.is_read ? (
                            <MailOpen className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Mail className="h-4 w-4 text-foreground" />
                          )}
                          <p className="font-medium text-foreground">{inquiry.name}</p>
                          <span className="text-xs text-muted-foreground">{inquiry.email}</span>
                        </div>
                        {inquiry.phone && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Phone / WhatsApp: {inquiry.phone}
                          </p>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {inquiry.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(inquiry.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!inquiry.is_read && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markReadMutation.mutate(inquiry.id)}
                          >
                            Mark read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteInquiryId(inquiry.id)}
                          aria-label="Delete inquiry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? "Edit Project" : "New Project"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <Input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
              <p className="text-sm font-medium text-foreground">Project Image</p>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)}
              />
              {selectedImageFile ? (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedImageFile.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No new file selected. Existing image will be kept.
                </p>
              )}
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt="Project preview"
                  className="h-24 w-full rounded-md object-cover"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Live URL"
                value={form.live_url}
                onChange={(e) => setForm({ ...form, live_url: e.target.value })}
              />
              <Input
                placeholder="GitHub URL"
                value={form.github_url}
                onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              />
            </div>
            <Input
              placeholder="Tags (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Display order"
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
            />
            <Button type="submit" className="w-full" disabled={saveMutation.isPending || isUploadingImage}>
              {saveMutation.isPending || isUploadingImage ? "Saving..." : "Save Project"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inquiry Delete Confirmation */}
      <AlertDialog open={!!deleteInquiryId} onOpenChange={() => setDeleteInquiryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteInquiryId && deleteInquiryMutation.mutate(deleteInquiryId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
