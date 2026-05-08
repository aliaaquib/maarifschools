"use client";

import { BookOpen, ChevronRight, Copy, Sparkles, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import { ClassRecord } from "@/types";

interface MyClassesCardProps {
  classes: ClassRecord[];
  onOpenAll: () => void;
  onCreateClass: () => void;
  onOpenClass: (classId: string) => void;
  onInviteClass: (classId: string) => void;
}

function getTone(index: number) {
  const tones = [
    "bg-[#EEF2FF] text-[#4F46E5]",
    "bg-[#ECFDF5] text-[#15803D]",
    "bg-[#FFF7ED] text-[#EA580C]",
    "bg-[#F5F3FF] text-[#6D28D9]",
  ];

  return tones[index % tones.length];
}

function getStatusTone(status: "Today" | "Upcoming" | "Active") {
  if (status === "Today") {
    return "bg-[#EEF2FF] text-[#4F46E5]";
  }

  if (status === "Upcoming") {
    return "bg-[#ECFDF5] text-[#166534]";
  }

  return "bg-[#F5F3FF] text-[#6D28D9]";
}

function getClassStatus(classItem: ClassRecord): "Today" | "Upcoming" | "Active" {
  const created = new Date(classItem.createdAt);
  const now = new Date();
  if (created.toDateString() === now.toDateString()) {
    return "Today";
  }

  if (classItem.studentCount > 0) {
    return "Active";
  }

  return "Upcoming";
}

export function MyClassesCard({ classes, onOpenAll, onCreateClass, onOpenClass, onInviteClass }: MyClassesCardProps) {
  const visibleClasses = classes.slice(0, 4);

  return (
    <Card className="rounded-[12px] border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(17,24,39,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[18px] font-semibold text-[#111827]">My Classes</h3>
        <button
          type="button"
          onClick={onOpenAll}
          className="text-sm font-medium text-[#6D28D9] transition hover:text-[#5B21B6]"
        >
          View all
        </button>
      </div>

      {visibleClasses.length > 0 ? (
        <div className="mt-4 space-y-4">
          {visibleClasses.map((classItem, index) => {
            const status = getClassStatus(classItem);
            return (
              <div
                key={classItem.id}
                className="rounded-[16px] border border-[#F3F4F6] bg-white px-4 py-4 transition hover:bg-[#FAFAFA]"
              >
                <button
                  type="button"
                  onClick={() => onOpenClass(classItem.id)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${getTone(index)}`}>
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">{classItem.name}</p>
                        <p className="mt-1 text-sm text-[#6B7280]">
                          {classItem.subject} • {classItem.grade}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusTone(status)}`}>
                        {status}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-[#6B7280]">
                      <div className="flex items-center gap-2">
                        <UsersRound className="h-3.5 w-3.5" />
                        <span>{classItem.studentCount} students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Invite code {classItem.inviteCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>{classItem.description || `Created ${formatRelativeDate(classItem.createdAt)}`}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                </button>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 flex-1"
                    onClick={() => onInviteClass(classItem.id)}
                  >
                    <Copy className="h-4 w-4" />
                    Invite
                  </Button>
                  <Button type="button" className="h-9 flex-1" onClick={() => onOpenClass(classItem.id)}>
                    Open Class
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon={BookOpen}
            title="Create your first class"
            description="Set up a classroom, invite students, and organize lessons in one calm workspace."
            action={
              <Button onClick={onCreateClass}>
                Create Class
              </Button>
            }
          />
        </div>
      )}
    </Card>
  );
}
