"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { ArrowRight, BookOpen, ChevronLeft, Flame, FolderOpen, MessageCircle, MessagesSquare, School2, Send, Upload, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SCHOOL_CHAT_ROOMS } from "@/lib/constants";
import { toUserFacingError } from "@/lib/errors";
import { ResourceRecord, DiscussionPost, DiscussionComment, SchoolMessage, UserProfile } from "@/types";
import { formatRelativeDate, initials } from "@/lib/utils";

interface DashboardOverviewProps {
  profile: UserProfile;
  resources: ResourceRecord[];
  myResources: ResourceRecord[];
  posts: DiscussionPost[];
  comments: DiscussionComment[];
  schoolMessages: SchoolMessage[];
  onOpenUpload: () => void;
  onInviteTeachers: () => void;
  onStartDiscussion: () => void;
  onExploreResources: () => void;
  onOpenSchoolChat: () => void;
  onSendSchoolMessage: (input: { content: string; room: SchoolMessage["room"] }) => Promise<void>;
  onSelectResource: (resource: ResourceRecord) => void;
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
  resources,
  myResources,
  posts,
  comments,
  schoolMessages,
  onOpenUpload,
  onInviteTeachers,
  onStartDiscussion,
  onExploreResources,
  onOpenSchoolChat,
  onSendSchoolMessage,
  onSelectResource,
  currentUserId,
}: DashboardOverviewProps) {
  const [isMiniChatOpen, setIsMiniChatOpen] = useState(false);
  const [activeMiniChatRoom, setActiveMiniChatRoom] = useState<SchoolMessage["room"]>("general");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [miniChatError, setMiniChatError] = useState("");
  const greetingName = profile.name.split(" ")[0] || "Teacher";
  const schoolName = profile.schoolName || "Maarif International School";
  const schoolResources = resources.filter((resource) => resource.resourceScope === "school");
  const newResourcesToday = schoolResources.filter((resource) => {
    const created = new Date(resource.createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  }).length;
  const highlightedPost = posts[0] ?? null;
  const chatGroups = SCHOOL_CHAT_ROOMS.map((room) => {
    const roomMessages = schoolMessages.filter((message) => message.room === room.id);
    const latestMessage = roomMessages[roomMessages.length - 1] ?? null;

    return {
      id: room.id,
      name: room.name,
      preview: latestMessage?.content || room.fallbackPreview,
      time: latestMessage ? formatRelativeDate(latestMessage.createdAt) : "No messages yet",
      unread: latestMessage ? 1 : 0,
      tone: room.tone,
    };
  });

  const activeMiniChatMeta =
    SCHOOL_CHAT_ROOMS.find((room) => room.id === activeMiniChatRoom) ?? SCHOOL_CHAT_ROOMS[0];
  const activeMiniChatMessages = schoolMessages.filter((message) => message.room === activeMiniChatRoom);

  async function handleMiniChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const content = String(formData.get("content") ?? "").trim();

    if (!content) {
      return;
    }

    setSendingMessage(true);
    setMiniChatError("");

    try {
      await onSendSchoolMessage({ content, room: activeMiniChatRoom });
      form.reset();
    } catch (error) {
      setMiniChatError(toUserFacingError(error, "Could not send message."));
    } finally {
      setSendingMessage(false);
    }
  }

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
                <FolderOpen className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.02em] text-[#6B7280]">My Resources</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#111827]">{myResources.length}</p>
            <p className="mt-2.5 text-sm text-[#6B7280]">Resources uploaded by you</p>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]">
              View all my resources <ArrowRight className="h-4 w-4" />
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
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]">
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
              {highlightedPost?.content || "How to teach HTML effectively?"}
            </p>
            <p className="mt-2.5 text-sm text-[#6B7280]">
              {comments.filter((comment) => comment.postId === highlightedPost?.id).length || 8} replies • Trending discussion
            </p>
            <button className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]">
              View discussion <ArrowRight className="h-4 w-4" />
            </button>
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
        <Card className="h-full rounded-[12px] border-[#E5E7EB] bg-white p-4 shadow-[0_4px_16px_rgba(17,24,39,0.03)]">
          {!isMiniChatOpen ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold text-[#111827]">School Chat</h3>
                <button className="text-sm font-medium text-[#6D28D9]" onClick={() => setIsMiniChatOpen(true)}>
                  Create thread
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {chatGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setActiveMiniChatRoom(group.id);
                      setIsMiniChatOpen(true);
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl border border-[#F3F4F6] px-3 py-2.5 text-left transition-all duration-150 hover:bg-[#F9FAFB]"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${group.tone}`}>
                      <MessagesSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[#111827]">{group.name}</p>
                        <span className="text-sm text-[#9CA3AF]">{group.time}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-[#6B7280]">{group.preview}</p>
                    </div>
                    {group.unread > 0 ? (
                      <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#6D28D9] px-1.5 text-xs font-semibold text-white">
                        {group.unread}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
              <button
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#6D28D9]"
                onClick={() => {
                  setActiveMiniChatRoom("general");
                  setIsMiniChatOpen(true);
                }}
              >
                View all conversations <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex h-full min-h-[520px] flex-col">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#6D28D9]"
                    onClick={() => setIsMiniChatOpen(false)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#111827]">School Chat</h3>
                    <p className="text-sm text-[#6B7280]">{activeMiniChatMeta.name}</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-[#6D28D9]" onClick={onOpenSchoolChat}>
                  Full view
                </button>
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                <div className="mb-3 flex flex-wrap gap-2">
                  {SCHOOL_CHAT_ROOMS.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setActiveMiniChatRoom(room.id)}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        room.id === activeMiniChatRoom
                          ? "bg-[#F5F3FF] font-medium text-[#6D28D9]"
                          : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>

                {activeMiniChatMessages.length === 0 ? (
                  <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#E5E7EB] bg-[#FCFCFD] px-4 text-center">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">No messages in {activeMiniChatMeta.name} yet</p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Start the conversation with teachers in this room.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeMiniChatMessages.map((message) => {
                    const isOwn = message.userId === currentUserId;

                    return (
                      <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[88%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                          <div className="mb-1 flex items-center gap-2 px-1">
                            {!isOwn ? (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E5E7EB] bg-white text-[11px] font-semibold text-[#111827]">
                                {message.userAvatar ? (
                                  <img
                                    src={message.userAvatar}
                                    alt={message.userName}
                                    className="h-full w-full rounded-full object-cover"
                                  />
                                ) : (
                                  initials(message.userName)
                                )}
                              </div>
                            ) : null}
                            <p className="text-xs font-medium text-[#111827]">
                              {isOwn ? "You" : message.userName}
                            </p>
                            <p className="text-xs text-[#9CA3AF]">{formatRelativeDate(message.createdAt)}</p>
                          </div>
                          <div
                            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                              isOwn
                                ? "bg-[#6D28D9] text-white"
                                : "border border-[#E5E7EB] bg-[#FCFCFD] text-[#111827]"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="mt-4 border-t border-[#F3F4F6] pt-4" onSubmit={handleMiniChatSubmit}>
                <div className="space-y-3">
                  <Textarea
                    name="content"
                    placeholder={`Write in ${activeMiniChatMeta.name}...`}
                    className="min-h-[88px] resize-none"
                    required
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-h-[20px]">
                      {miniChatError ? <p className="text-sm text-foreground/80">{miniChatError}</p> : null}
                    </div>
                    <Button type="submit" disabled={sendingMessage} loading={sendingMessage} loadingText="Sending...">
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
