import { motion, AnimatePresence } from "framer-motion";
import { CiMenuFries } from "react-icons/ci";
import { RiMessage3Fill, RiMessage3Line } from "react-icons/ri";
import { useViewContext } from "../../context/viewContext";

export default function NavMobile() {
  const { view, setView } = useViewContext();

  // Animation variants
  const navVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: 0.1,
      },
    },
    exit: {
      y: 100,
      opacity: 0,
      transition: { duration: 0.2 },
    },
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  const iconVariants = {
    inactive: { rotate: 0 },
    active: { rotate: 360, transition: { duration: 0.4, type: "spring" } },
  };

  const backgroundVariants = {
    inactive: {
      width: "40px",
      backgroundColor: "rgba(109, 131, 242, 0)",
    },
    active: {
      width: "120px",
      backgroundColor: "rgb(109, 131, 242)",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.nav
      className={`w-fit text-xl z-100 fixed bottom-0 md:hidden m-5 flex bg-black/30 pl-3 pr-4.5 py-2 rounded-full items-center gap-3 shadow-lg backdrop-blur-lg saturate-150 ${
        view === "chat" ? "hidden" : "block"
      }`}
      variants={navVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key="mobile-nav"
    >
      {/* Messages Button */}
      <motion.section
        onClick={() => setView("messages")}
        className="relative flex items-center justify-center"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial="rest"
        animate="rest"
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          variants={backgroundVariants}
          animate={view === "messages" ? "active" : "inactive"}
        />

        <div className="relative z-10 flex gap-2 items-center px-4 py-2">
          <motion.div
            variants={iconVariants}
            animate={view === "messages" ? "active" : "inactive"}
          >
            {view === "messages" ? (
              <RiMessage3Fill className="text-white" />
            ) : (
              <RiMessage3Line className="text-white" />
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {view === "messages" && (
              <motion.span
                className="text-white text-sm font-medium whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                Messages
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* Menu Button */}
      <motion.section
        onClick={() => setView("profile")}
        className="relative flex items-center justify-center"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial="rest"
        animate="rest"
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          variants={backgroundVariants}
          animate={view === "profile" ? "active" : "inactive"}
        />

        <div
          className={`relative z-10 flex gap-2 items-center px-4  py-2 ${
            view === "profile" && "mr-4"
          }`}
        >
          <motion.div
            variants={iconVariants}
            animate={view === "profile" ? "active" : "inactive"}
          >
            <CiMenuFries className="text-white" />
          </motion.div>

          <AnimatePresence mode="wait">
            {view === "profile" && (
              <motion.span
                className="text-white text-sm font-medium whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                Profile
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </motion.nav>
  );
}
