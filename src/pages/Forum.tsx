import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Session } from "@supabase/supabase-js";
import { MessageSquare, Plus, ThumbsUp, User } from "lucide-react";

const Forum = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    loadPosts();

    const channel = supabase
      .channel("forum_posts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_posts",
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from("forum_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error);
      return;
    }

    setPosts(data || []);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("forum_posts").insert({
        user_id: session.user.id,
        title,
        content,
      });

      if (error) throw error;

      toast.success("Post created successfully");
      setTitle("");
      setContent("");
      setDialogOpen(false);
      loadPosts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (postId: string, currentUpvotes: number) => {
    const { error } = await supabase
      .from("forum_posts")
      .update({ upvotes: currentUpvotes + 1 })
      .eq("id", postId);

    if (error) {
      toast.error("Failed to upvote");
    } else {
      loadPosts();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Community Forum</h1>
          <p className="text-muted-foreground">
            Connect, share experiences, and support each other
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
              <DialogDescription>
                Share your thoughts, experiences, or ask for support
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="post-title">Title</Label>
                <Input
                  id="post-title"
                  placeholder="Enter post title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-content">Content</Label>
                <Textarea
                  id="post-content"
                  placeholder="Write your post..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={6}
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Post"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No posts yet. Be the first to start a discussion!
              </p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                      <CardDescription>
                        by Anonymous •{" "}
                        {new Date(post.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUpvote(post.id, post.upvotes)}
                    className="flex items-center gap-2"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{post.upvotes}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {post.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Forum;