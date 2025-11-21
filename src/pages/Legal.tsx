import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Legal = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    const { data } = await supabase
      .from("legal_resources")
      .select("*")
      .order("category")
      .order("title");

    setResources(data || []);
  };

  const categories = Array.from(new Set(resources.map((r) => r.category)));

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || resource.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedResources: Record<string, any[]> = filteredResources.reduce((acc, resource) => {
    if (!acc[resource.category]) {
      acc[resource.category] = [];
    }
    acc[resource.category].push(resource);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Legal Resources</h1>
        <p className="text-muted-foreground">
          Comprehensive legal information to help you understand your rights and take action
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search legal resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Badge>
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedResources).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No resources found matching your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedResources).map(([category, categoryResources]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-xl text-primary">{category}</CardTitle>
                <CardDescription>
                  {categoryResources.length} resource
                  {categoryResources.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {categoryResources.map((resource, index) => (
                    <AccordionItem key={resource.id} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {resource.title}
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                          {resource.content}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Legal;