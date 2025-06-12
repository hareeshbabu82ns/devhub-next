"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from "@/components/utils/icons";
import { Calendar, Star, Bookmark } from "lucide-react";
import EverydayDevotionalTab from "./EverydayDevotionalTab";
import WeeklyDevotionalTab from "./WeeklyDevotionalTab";
import BookmarkedEntitiesGrid from "./BookmarkedEntitiesGrid";
import { cn } from "@/lib/utils";

interface DevotionalQuickAccessProps {
  className?: string;
}

const DevotionalQuickAccess: React.FC<DevotionalQuickAccessProps> = ({
  className,
}) => {
  return (
    <Card className={cn("rounded-sm p-0 flex-1", className)}>
      <Tabs defaultValue="everyday" className="w-full">
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 border-b gap-2">
            <CardTitle className="flex items-center gap-2">
              <Icons.heart className="h-5 w-5 text-red-500" />
              Quick Access
            </CardTitle>
            <TabsList className="grid w-full grid-cols-3 sm:w-auto">
              <TabsTrigger value="everyday" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Every Day
              </TabsTrigger>
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Days of Week
              </TabsTrigger>
              <TabsTrigger
                value="bookmarks"
                className="flex items-center gap-2"
              >
                <Bookmark className="h-4 w-4" />
                Bookmarks
              </TabsTrigger>
            </TabsList>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <TabsContent value="everyday">
            <EverydayDevotionalTab />
          </TabsContent>

          <TabsContent value="daily">
            <WeeklyDevotionalTab />
          </TabsContent>

          <TabsContent value="bookmarks">
            <BookmarkedEntitiesGrid />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
};

export default DevotionalQuickAccess;
