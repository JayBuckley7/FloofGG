import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";

interface Props {
  boardId: Id<"boards">;
  ownerId: Id<"users">;
}

export function BoardMembers({ boardId, ownerId }: Props) {
  const members = useQuery(api.boards.listMembers, { boardId }) || [];
  const currentUser = useQuery(api.auth.loggedInUser);
  const addMember = useMutation(api.boards.addMember);
  const removeMember = useMutation(api.boards.removeMember);
  const leaveBoard = useMutation(api.boards.leaveBoard);
  const [newUserId, setNewUserId] = useState("");

  const handleAdd = async () => {
    if (!newUserId) return;
    await addMember({ boardId, userId: newUserId as Id<"users">, role: "editor" });
    setNewUserId("");
  };

  const handleLeave = async () => {
    await leaveBoard({ boardId });
  };

  const isOwner = currentUser?._id === ownerId;

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Collaborators</h3>
      <ul className="mb-2">
        {members.filter(m => m.role !== "owner").map(m => (
          <li key={m.userId} className="flex items-center gap-2 text-sm">
            <span>{m.email || m.userId}</span>
            {isOwner && (
              <button className="text-red-500" onClick={() => removeMember({ boardId, userId: m.userId })}>Remove</button>
            )}
          </li>
        ))}
      </ul>
      {isOwner ? (
        <div className="flex gap-2">
          <input
            className="border px-1 text-sm"
            placeholder="User id"
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
          />
          <button className="px-2 bg-blue-600 text-white text-sm" onClick={handleAdd}>Add</button>
        </div>
      ) : (
        <button className="text-sm text-red-500" onClick={handleLeave}>Leave board</button>
      )}
    </div>
  );
}
