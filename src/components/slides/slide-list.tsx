"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { Slide } from "@/types/slide";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SlideListProps = {
  slides: Slide[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

function SortableSlideItem({
  slide,
  index,
  isSelected,
  total,
  onSelect,
  onMoveUp,
  onMoveDown,
}: {
  slide: Slide;
  index: number;
  isSelected: boolean;
  total: number;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-lg border px-2 py-2 text-sm",
        isSelected
          ? "border-primary bg-accent"
          : "border-border bg-card hover:bg-accent/50",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        className="inline-flex min-h-10 min-w-10 cursor-grab items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder slide ${index + 1}`}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={onSelect}
        aria-current={isSelected ? "true" : undefined}
        className="min-h-10 flex-1 truncate rounded-md px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="text-xs text-muted-foreground">{index + 1}.</span>{" "}
        {slide.title || "Untitled"}
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-10 min-w-10"
        onClick={onMoveUp}
        disabled={index === 0}
        aria-label={`Move slide ${index + 1} up`}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="min-h-10 min-w-10"
        onClick={onMoveDown}
        disabled={index >= total - 1}
        aria-label={`Move slide ${index + 1} down`}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SlideList({
  slides,
  selectedId,
  onSelect,
  onReorder,
}: SlideListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function moveSlide(from: number, to: number) {
    if (to < 0 || to >= slides.length) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onReorder(reordered.map((s) => s.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...slides];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    onReorder(reordered.map((s) => s.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={slides.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2" role="list">
          {slides.map((slide, index) => (
            <div key={slide.id} role="listitem">
              <SortableSlideItem
                slide={slide}
                index={index}
                total={slides.length}
                isSelected={selectedId === slide.id}
                onSelect={() => onSelect(slide.id)}
                onMoveUp={() => moveSlide(index, index - 1)}
                onMoveDown={() => moveSlide(index, index + 1)}
              />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
