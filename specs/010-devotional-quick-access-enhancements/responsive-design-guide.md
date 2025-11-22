# Responsive Design Quick Reference

## Breakpoint System

```typescript
// Tailwind breakpoints (default + custom)
{
  'xs': '475px',   // Large phones
  'sm': '640px',   // Small tablets
  'md': '768px',   // Tablets
  'lg': '1024px',  // Laptops
  'xl': '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
}
```

## Layout Patterns

### Tab List (Mobile-First)

```tsx
{
  /* Mobile: Full-width stacked tabs */
}
<TabsList
  className="
  grid w-full grid-cols-3 h-auto
  sm:w-auto sm:h-10
"
>
  <TabsTrigger
    className="
    flex items-center gap-1 text-xs py-2
    sm:gap-2 sm:text-sm sm:py-0
  "
  >
    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
    <span className="hidden xs:inline">Full Text</span>
    <span className="xs:hidden">Short</span>
  </TabsTrigger>
</TabsList>;
```

**Visual**:

```
Mobile (<475px):         Large Phone (>475px):      Tablet+ (>640px):
┌─────────────────┐     ┌───────────────────┐      ┌──────────────────────┐
│ [=][☆][📖]     │     │ [=][Daily][Saved] │      │ [...][Every Day][...]│
│ (full width)    │     │ (full width)      │      │ (auto width)         │
└─────────────────┘     └───────────────────┘      └──────────────────────┘
```

### Day Selector (Horizontal Scroll)

```tsx
<ScrollArea className="w-full sm:w-auto">
  <div className="flex gap-2 pb-2">
    {DAYS_OF_WEEK.map((day, index) => (
      <Button
        key={day}
        className="
          flex flex-col h-auto px-3 py-2
          min-w-[64px] shrink-0
        "
      >
        <span className="text-xs font-medium whitespace-nowrap">
          {day.slice(0, 3)} {/* Mon, Tue, etc. */}
        </span>
        <span className="text-[10px] opacity-70 hidden sm:block">
          {deity} {/* Show deity on tablet+ */}
        </span>
      </Button>
    ))}
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

**Visual**:

```
Mobile (scroll):
┌────────────────────────┐
│ ← [Sun][Mon][Tue]→     │
│   (swipe for more)     │
└────────────────────────┘

Desktop (all visible):
┌──────────────────────────────────────────┐
│ [Sun][Mon][Tue][Wed][Thu][Fri][Sat]     │
│ Surya Shiva Hanuman Ganesha Vishnu...   │
└──────────────────────────────────────────┘
```

### Action Buttons (Context-Aware)

```tsx
<div
  className="
  flex items-center gap-2
  justify-start sm:justify-end
  flex-wrap sm:flex-nowrap
"
>
  <EntitySearchDlgTrigger />
  <PaginationDDLB className="order-last sm:order-none" />
  <Button size="icon" aria-label="Refresh">
    <Icons.refresh className="h-4 w-4" />
  </Button>
</div>
```

**Visual**:

```
Mobile (stacked):          Desktop (inline):
┌──────────────────┐      ┌───────────────────────┐
│ [+] [↻]          │      │        [+][Page▼][↻] │
│ [Page 1/5 ▼]     │      │                       │
└──────────────────┘      └───────────────────────┘
```

### Entity Grid (Adaptive Columns)

```tsx
<div className={cn(
  "grid gap-4 lg:gap-6",
  // Viewport: Columns
  "grid-cols-1",         // < 475px:  1 col
  "xs:grid-cols-2",      // ≥ 475px:  2 cols
  "sm:grid-cols-2",      // ≥ 640px:  2 cols
  "md:grid-cols-3",      // ≥ 768px:  3 cols
  "lg:grid-cols-4",      // ≥ 1024px: 4 cols
  "xl:grid-cols-5",      // ≥ 1280px: 5 cols
  "2xl:grid-cols-6"      // ≥ 1536px: 6 cols
)}>
```

**Visual**:

```
Mobile:       Tablet:          Desktop:         Ultrawide:
┌───┐         ┌───┬───┬───┐   ┌───┬───┬───┬───┐ ┌───┬───┬───┬───┬───┬───┐
│ A │         │ A │ B │ C │   │ A │ B │ C │ D │ │ A │ B │ C │ D │ E │ F │
└───┘         ├───┼───┼───┤   ├───┼───┼───┼───┤ ├───┼───┼───┼───┼───┼───┤
┌───┐         │ D │ E │ F │   │ E │ F │ G │ H │ │ G │ H │ I │ J │ K │ L │
│ B │         └───┴───┴───┘   └───┴───┴───┴───┘ └───┴───┴───┴───┴───┴───┘
└───┘
1 column      3 columns        4 columns        6 columns
```

### Entity Action Menu (Touch vs Mouse)

```tsx
<div
  className={cn(
    "absolute top-2 right-2 z-10",
    isTouchDevice
      ? "opacity-100 bg-background/95 backdrop-blur-sm rounded-md shadow-lg"
      : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
  )}
>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant={isTouchDevice ? "ghost" : "outline"}
        size="icon"
        className="h-8 w-8"
      >
        <Icons.moreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
  </DropdownMenu>
</div>
```

**Visual**:

```
Touch Device (always visible):
┌──────────────────┐
│ ╔════════════╗   │
│ ║  Content   ║ ⋮ │ ← Visible
│ ╚════════════╝   │
└──────────────────┘

Mouse Device (hover to show):
┌──────────────────┐     ┌──────────────────┐
│ ╔════════════╗   │     │ ╔════════════╗   │
│ ║  Content   ║   │ --> │ ║  Content   ║ ⋮ │ ← Shows on hover
│ ╚════════════╝   │     │ ╚════════════╝   │
└──────────────────┘     └──────────────────┘
```

## Component-Specific Patterns

### Card Header (Flexible Layout)

```tsx
<CardHeader className="p-0">
  <div
    className="
    flex flex-col gap-2 p-2 border-b
    sm:flex-row sm:items-center sm:justify-between
  "
  >
    <CardTitle className="text-base sm:text-lg">Quick Access</CardTitle>
    {/* Tabs or other controls */}
  </div>
</CardHeader>
```

### Pagination Controls

```tsx
{
  /* Compact on mobile, full on desktop */
}
<PaginationDDLB
  className="
    text-xs sm:text-sm
    min-w-[120px] sm:min-w-[150px]
  "
  totalCount={total}
  limit={limit}
  page={page}
/>;
```

### Empty State (Centered)

```tsx
<EmptyState
  className="
    py-8 px-4
    sm:py-12 sm:px-6
    lg:py-16
  "
  icon={Icon}
  title="Title"
  description="Description"
/>
```

## Touch Device Optimizations

### Detecting Touch

```tsx
import { useMediaQuery } from "@/hooks/use-media-query";

const isTouchDevice = useMediaQuery("(pointer: coarse)");
```

### Touch-Friendly Targets

```css
/* Minimum touch target: 44x44px (WCAG 2.5.5) */
.touch-target {
  @apply min-h-[44px] min-w-[44px];
}

/* Button sizing */
Button {
  size: "sm"  // h-9 (36px) + padding ≈ 44px
  size: "default" // h-10 (40px)
  size: "lg" // h-11 (44px)
}
```

### Scroll Behavior

```tsx
{
  /* Horizontal scroll with momentum */
}
<ScrollArea className="w-full">
  <div className="flex gap-2 pb-2">
    {/* Items with fixed width for predictable scrolling */}
    {items.map((item) => (
      <Button className="min-w-[64px] shrink-0">{item}</Button>
    ))}
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>;
```

## Accessibility Patterns

### Focus Indicators

```tsx
className={cn(
  "focus-visible:ring-2",
  "focus-visible:ring-ring",
  "focus-visible:ring-offset-2"
)}
```

### Skip Links

```tsx
<a
  href="#main-content"
  className="
    sr-only
    focus:not-sr-only
    focus:absolute focus:top-4 focus:left-4 focus:z-50
    focus:px-4 focus:py-2
    focus:bg-background focus:border focus:rounded-md
  "
>
  Skip to content
</a>
```

### Live Regions

```tsx
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {loadingMessage || successMessage}
</div>
```

## Performance Tips

### Conditional Rendering

```tsx
{
  /* Render heavy components only when visible */
}
<TabsContent value="daily">
  {currentState.tab === "daily" && <WeeklyDevotionalTab />}
</TabsContent>;
```

### Image Optimization

```tsx
import Image from "next/image";

<Image
  src={entity.imageThumbnail}
  alt={entity.text}
  width={300}
  height={300}
  loading="lazy" // Lazy load below fold
  sizes="
    (max-width: 475px) 100vw,
    (max-width: 640px) 50vw,
    (max-width: 1024px) 33vw,
    25vw
  "
/>;
```

### Virtualization (Large Lists)

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 200,
  overscan: 5, // Render 5 extra items
});
```

## Testing Viewports

### Manual Testing Sizes

```typescript
const TEST_VIEWPORTS = [
  { name: "Mobile S", width: 320, height: 568 }, // iPhone SE
  { name: "Mobile M", width: 375, height: 667 }, // iPhone 6/7/8
  { name: "Mobile L", width: 414, height: 896 }, // iPhone XR
  { name: "Tablet", width: 768, height: 1024 }, // iPad
  { name: "Laptop", width: 1366, height: 768 }, // Common laptop
  { name: "Desktop", width: 1920, height: 1080 }, // Full HD
  { name: "Ultrawide", width: 2560, height: 1440 }, // 2K
];
```

### Playwright Viewport Tests

```typescript
test.describe("Responsive Layout", () => {
  test("mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // Test mobile-specific features
  });

  test("tablet layout", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    // Test tablet-specific features
  });

  test("desktop layout", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    // Test desktop-specific features
  });
});
```

## Debugging Tips

### Visualizing Breakpoints

```tsx
{
  /* Development only */
}
{
  process.env.NODE_ENV === "development" && (
    <div className="fixed bottom-4 right-4 z-50 bg-black text-white p-2 text-xs rounded">
      <span className="xs:hidden">base</span>
      <span className="hidden xs:inline sm:hidden">xs</span>
      <span className="hidden sm:inline md:hidden">sm</span>
      <span className="hidden md:inline lg:hidden">md</span>
      <span className="hidden lg:inline xl:hidden">lg</span>
      <span className="hidden xl:inline 2xl:hidden">xl</span>
      <span className="hidden 2xl:inline">2xl</span>
    </div>
  );
}
```

### Responsive Design DevTools

1. **Chrome DevTools**: Toggle device toolbar (Cmd/Ctrl + Shift + M)
2. **Firefox Responsive Design Mode**: Cmd/Ctrl + Shift + M
3. **Safari**: Develop menu → Enter Responsive Design Mode

### Common Issues

```typescript
// ❌ Wrong: Fixed width
<div className="w-[300px]">

// ✅ Right: Responsive width
<div className="w-full max-w-xs sm:max-w-sm lg:max-w-md">

// ❌ Wrong: Absolute positioning without breakpoints
<div className="absolute right-4">

// ✅ Right: Responsive positioning
<div className="relative sm:absolute sm:right-4">

// ❌ Wrong: Fixed grid columns
<div className="grid grid-cols-4">

// ✅ Right: Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
```

## Cheat Sheet

| Need                | Solution                                                  |
| ------------------- | --------------------------------------------------------- |
| Hide on mobile      | `hidden sm:block`                                         |
| Show only on mobile | `block sm:hidden`                                         |
| Responsive text     | `text-sm sm:text-base lg:text-lg`                         |
| Responsive spacing  | `p-2 sm:p-4 lg:p-6`                                       |
| Responsive flex     | `flex-col sm:flex-row`                                    |
| Responsive grid     | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`               |
| Container width     | `max-w-full sm:max-w-screen-sm lg:max-w-screen-lg`        |
| Touch-friendly size | `min-h-[44px] min-w-[44px]`                               |
| Responsive gap      | `gap-2 sm:gap-4 lg:gap-6`                                 |
| Conditional render  | `{isMobile ? <MobileComponent /> : <DesktopComponent />}` |

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [WCAG Touch Target Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Next.js Image Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing/images)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
