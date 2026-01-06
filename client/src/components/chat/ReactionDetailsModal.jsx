import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { getMessageReactions } from "../../utility/chatUtils";

export default function ReactionDetailsModal({
  reactionDetails,
  setReactionDetails,
  sender_id,
}) {
  return (
    <AnimatePresence>
      {reactionDetails && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setReactionDetails(null)}
        >
          <div
            className="bg-[var(--black)] border border-gray-600 rounded-3xl p-6 min-w-[300px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between mb-4">
              <h3 className="text-white text-lg">Reactions</h3>
              <button onClick={() => setReactionDetails(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {getMessageReactions(reactionDetails, sender_id).map((r) => (
                <div key={r.type} className="flex justify-between py-2">
                  <div className="flex gap-3">
                    <span>{r.emoji}</span>
                    <span className="capitalize">{r.type}</span>
                  </div>
                  <span>{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
