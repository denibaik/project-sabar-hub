import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Calendar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-3", className)}
    {...props}
  />
));
Calendar.displayName = "Calendar";

const CalendarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between pb-4", className)}
    {...props}
  />
));
CalendarHeader.displayName = "CalendarHeader";

const CalendarTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
CalendarTitle.displayName = "CalendarTitle";

const CalendarNav = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center space-x-2", className)}
    {...props}
  />
));
CalendarNav.displayName = "CalendarNav";

const CalendarPrevButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "p-2 rounded-md hover:bg-accent",
      className
    )}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
  </button>
));
CalendarPrevButton.displayName = "CalendarPrevButton";

const CalendarNextButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "p-2 rounded-md hover:bg-accent",
      className
    )}
    {...props}
  >
    <ChevronRight className="h-4 w-4" />
  </button>
));
CalendarNextButton.displayName = "CalendarNextButton";

const CalendarGrid = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("grid grid-cols-7 gap-1 mt-4", className)}
    {...props}
  />
));
CalendarGrid.displayName = "CalendarGrid";

const CalendarWeekday = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-muted-foreground text-sm font-medium p-2 text-center",
      className
    )}
    {...props}
  />
));
CalendarWeekday.displayName = "CalendarWeekday";

const CalendarDay = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isToday?: boolean;
    isSelected?: boolean;
  }
>(({ className, isToday, isSelected, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "p-2 rounded-md text-sm font-medium h-9 w-9",
      isToday && "bg-accent",
      isSelected && "bg-primary text-primary-foreground",
      className
    )}
    {...props}
  />
));
CalendarDay.displayName = "CalendarDay";

export {
  Calendar,
  CalendarHeader,
  CalendarTitle,
  CalendarNav,
  CalendarPrevButton,
  CalendarNextButton,
  CalendarGrid,
  CalendarWeekday,
  CalendarDay,
};