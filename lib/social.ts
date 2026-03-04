import { supabase } from "./supabase"

export async function followUser(followerId: string, followingId: string) {
  await supabase.from("follows").insert([{
    id: crypto.randomUUID(),
    follower_id: followerId,
    following_id: followingId,
    created_at: new Date().toISOString(),
  }])
  await createNotification(followingId, "follow", `Someone started following you`, `/profile/${followerId}`)
}

export async function unfollowUser(followerId: string, followingId: string) {
  await supabase.from("follows").delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
}

export async function sendFriendRequest(senderId: string, receiverId: string) {
  await supabase.from("friend_requests").insert([{
    id: crypto.randomUUID(),
    sender_id: senderId,
    receiver_id: receiverId,
    status: "pending",
    created_at: new Date().toISOString(),
  }])
  await createNotification(receiverId, "friend_request", `You have a new friend request`, `/profile/${senderId}`)
}

export async function acceptFriendRequest(requestId: string, senderId: string, receiverId: string) {
  await supabase.from("friend_requests").update({ status: "accepted" }).eq("id", requestId)
  // Auto-follow each other
  await supabase.from("follows").upsert([
    { id: crypto.randomUUID(), follower_id: senderId, following_id: receiverId, created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), follower_id: receiverId, following_id: senderId, created_at: new Date().toISOString() },
  ])
  await createNotification(senderId, "friend_accepted", `Your friend request was accepted`, `/profile/${receiverId}`)
}

export async function rejectFriendRequest(requestId: string) {
  await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId)
}

export async function createNotification(userId: string, type: string, message: string, link: string) {
  await supabase.from("notifications").insert([{
    id: crypto.randomUUID(),
    user_id: userId,
    type,
    message,
    link,
    read: false,
    created_at: new Date().toISOString(),
  }])
}

export async function getFollowStatus(currentUserId: string, targetUserId: string) {
  const [followRes, friendRes] = await Promise.all([
    supabase.from("follows").select("id").eq("follower_id", currentUserId).eq("following_id", targetUserId).maybeSingle(),
    supabase.from("friend_requests").select("id, status, sender_id").or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${currentUserId})`
    ).maybeSingle(),
  ])
  return {
    isFollowing: !!followRes.data,
    friendRequest: friendRes.data,
    isFriend: friendRes.data?.status === "accepted",
  }
}