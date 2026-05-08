"use client";

import Image from "next/image";
import { ArrowRight, BookOpen, Flame, MessageCircle, School2, Upload, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MyClassesCard } from "@/components/dashboard/my-classes-card";
import { ClassRecord, ResourceRecord, DiscussionPost, DiscussionComment, UserProfile } from "@/types";

interface DashboardOverviewProps {
  profile: UserProfile;
  classes: ClassRecord[];
  resources: ResourceRecord[];
  myResources: ResourceRecord[];
  posts: DiscussionPost[];
  comments: DiscussionComment[];
  onOpenUpload: () => void;
  onInviteTeachers: () => void;
  onStartDiscussion: () => void;
  onExploreResources: () => void;
  onSelectResource: (resource: ResourceRecord) => void;
  onOpenMyClasses: () => void;
  onOpenStudents: () => void;
  onCreateClass: () => void;
  onInviteStudents: (classId: string) => void;
  onOpenClass: (classId: string) => void;
  currentUserId: string;
}

function getResourceAccent(index: number) {
  const accents = [
    "from-[#EDE9FE] via-[#DDD6FE] to-[#F5F3FF]",
    "from-[#DCFCE7] via-[#BBF7D0] to-[#F0FDF4]",
    "from-[#DBEAFE] via-[#BFDBFE] to-[#EFF6FF]",
    "from-[#FDE68A] via-[#FCD34D] to-[#FEF3C7]",
  ];

  return accents[index % accents.length];
}

function getDiscussionParticipants(post: DiscussionPost, comments: DiscussionComment[]) {
  const relatedComments = comments.filter((comment) => comment.postId === post.id);
  const participants = [
    { id: post.userId, name: post.userName, avatar: post.userAvatar ?? null },
    ...relatedComments.map((comment) => ({
      id: comment.userId,
      name: comment.userName,
      avatar: comment.userAvatar ?? null,
    })),
  ];

  return participants.filter(
    (participant, index, array) => array.findIndex((item) => item.id === participant.id) === index,
  );
}

export function DashboardOverview({
  profile,
  classes,
  resources,
  myResources,
  posts,
  comments,
  onOpenUpload,
  onInviteTeachers,
  onStartDiscussion,
  onExploreResources,
  onSelectResource,
  onOpenMyClasses,
  onOpenStudents,
  onCreateClass,
  onInviteStudents,
  onOpenClass,
  currentUserId,
}: DashboardOverviewProps) {
  const greetingName = profile.name.split(" ")[0] || "Teacher";
  const schoolName = profile.schoolName || "Maarif International School";
  const schoolResources = resources.filter((resource) => resource.resourceScope === "school");
  const totalStudents = classes.reduce((total, classItem) => total + classItem.studentCount, 0);
  const newResourcesToday = schoolResources.filter((resource) => {
    const created = new Date(resource.createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  }).length;
  const highlightedPost = posts[0] ?? null;
  const highlightedReplies = highlightedPost
    ? comments.filter((comment) => comment.postId === highlightedPost.id).length
    : 0;

  return (
    <div className="grid h-full gap-5 xl:grid-cols-[minmax(0,2fr)_320px]">
      <div className="space-y-3.5">
        <div className="flex flex-col gap-3 px-1 py-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-[#111827]">
              Welcome back, {greetingName}! <span className="inline-block">👋</span>
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-[#6B7280]">
              <School2 className="h-4 w-4 text-[#6D28D9]" />
              <span>{schoolName}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <Button
              className="h-9 rounded-xl bg-[#6D28D9] px-4 text-sm text-white shadow-[0_10px_20px_rgba(109,40,217,0.18)] hover:bg-[#5B21B6]"
              onClick={onOpenUpload}
            >
              <Upload className="h-4 w-4" />
              Upload Resource
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-xl border-[#E5E7EB] bg-white px-4 text-sm text-[#111827] hover:bg-[#F9FAFB]"
              onClick={onStartDiscussion}
            >
              <MessageCircle className="h-4 w-4" />
              Start Discussion
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card className="min-h-[148px] rounded-[12px] border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(17,24,39,0.03)] hover:-translate-y-[2px] hover:shadow-[0_8px_22px_rgba(17,24,39,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[#6D28D9]">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#6B7280]">Total Students</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">{totalStudents}</p>
            <p className="mt-2.5 text-sm text-[#6B7280]">Students across the classes you manage</p>
            <button
              type="button"
              onClick={onOpenStudents}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]"
            >
              View all my students <ArrowRight className="h-4 w-4" />
            </button>
          </Card>

          <Card className="min-h-[148px] rounded-[12px] border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(17,24,39,0.03)] hover:-translate-y-[2px] hover:shadow-[0_8px_22px_rgba(17,24,39,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF5] text-[#16A34A]">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#6B7280]">School Activity</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">{newResourcesToday}</p>
            <p className="mt-2.5 text-sm text-[#6B7280]">New resources added today</p>
            <button
              type="button"
              onClick={onExploreResources}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]"
            >
              View school resources <ArrowRight className="h-4 w-4" />
            </button>
          </Card>

          <Card className="min-h-[148px] rounded-[12px] border-[#E5E7EB] bg-white p-5 shadow-[0_4px_16px_rgba(17,24,39,0.03)] hover:-translate-y-[2px] hover:shadow-[0_8px_22px_rgba(17,24,39,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
                <Flame className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#6B7280]">Community Highlights</p>
            </div>
            <p className="mt-2 line-clamp-2 text-[24px] font-semibold leading-7 tracking-[-0.03em] text-[#111827]">
              {highlightedPost?.content || "No discussions yet"}
            </p>
            <p className="mt-2.5 text-sm text-[#6B7280]">
              {highlightedPost
                ? `${highlightedReplies} ${highlightedReplies === 1 ? "reply" : "replies"} • Latest discussion`
                : "Start a discussion to see the latest community highlight here."}
            </p>
            {highlightedPost ? (
              <button
                type="button"
                onClick={onStartDiscussion}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]"
              >
                View discussion <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </Card>

        </div>

        <Card className="overflow-hidden rounded-[20px] border-[#E5E7EB] bg-[radial-gradient(circle_at_center,_rgba(109,40,217,0.04),_transparent_56%),linear-gradient(180deg,#FFFFFF,#FFFFFF)] px-7 py-3.5 shadow-[0_4px_16px_rgba(17,24,39,0.03)]">
          <div className="grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr_auto]">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5B2CCB] text-white shadow-[0_8px_16px_rgba(91,44,203,0.16)]">
                <Users className="h-4.5 w-4.5" />
              </div>
              <div className="pt-1">
                <h2 className="whitespace-nowrap text-[18px] font-semibold tracking-[-0.02em] text-[#111827]">
                  Collaborate with your school
                </h2>
                <p className="mt-1.5 max-w-[370px] text-[14px] leading-7 text-[#374151]">
                  <span className="whitespace-nowrap">Share lesson plans, discover resources,</span>
                  <br />
                  <span className="whitespace-nowrap">and improve teaching together.</span>
                </p>
              </div>
            </div>

            <div className="relative flex min-h-[124px] items-center justify-center overflow-hidden">
              <Image
                src="/dashboard-collaboration-reference.png"
                alt="Teachers collaborating around shared resources"
                width={452}
                height={231}
                className="h-auto w-full max-w-[452px]"
              />
            </div>

            <div className="flex flex-col gap-3 justify-self-end">
              <Button
                className="h-9 min-w-[164px] rounded-xl bg-[#5B2CCB] px-4 text-sm text-white shadow-[0_10px_20px_rgba(91,44,203,0.18)] hover:bg-[#4C1FB8]"
                onClick={onInviteTeachers}
              >
                <Users className="h-4 w-4" />
                Invite Teachers
              </Button>
              <Button
                variant="outline"
                className="h-9 min-w-[164px] rounded-xl border-[#B8A7FF] bg-white px-4 text-sm text-[#5B2CCB] hover:bg-[#F5F3FF]"
                onClick={onExploreResources}
              >
                <BookOpen className="h-4 w-4" />
                Explore Resources
              </Button>
            </div>
          </div>
        </Card>

      </div>

      <div className="space-y-3.5">
        <MyClassesCard
          classes={classes}
          onOpenAll={onOpenMyClasses}
          onCreateClass={onCreateClass}
          onInviteClass={onInviteStudents}
          onOpenClass={onOpenClass}
        />
      </div>
    </div>
  );
}
