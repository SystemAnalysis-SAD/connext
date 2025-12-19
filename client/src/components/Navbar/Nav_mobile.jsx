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
      backgroundColor: "transparent",
    },
    active: {
      width: "120px",
      backgroundColor: "var(--primary)",
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
      },
    },
  };

  return (
    <motion.nav
      className={`w-fit text-xl z-100 fixed bottom-0 md:hidden m-5 flex bg-black/30 px-5 py-2 rounded-full items-center gap-3 shadow-lg backdrop-blur-sm ${
        !["users", "menu"].includes(view) && "hidden"
      }`}
      variants={navVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      key="mobile-nav"
    >
      {/* Messages Button */}
      <motion.section
        onClick={() => setView("users")}
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
          animate={view === "users" ? "active" : "inactive"}
        />

        <div className="relative z-10 flex gap-2 items-center px-4 py-2">
          <motion.div
            variants={iconVariants}
            animate={view === "users" ? "active" : "inactive"}
          >
            {view === "users" ? (
              <RiMessage3Fill className="text-white" />
            ) : (
              <RiMessage3Line className="text-white" />
            )}
          </motion.div>

          <AnimatePresence mode="wait">
            {view === "users" && (
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
        onClick={() => setView("menu")}
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
          animate={view === "menu" ? "active" : "inactive"}
        />

        <div
          className={`relative z-10 flex gap-2 items-center px-4  py-2 ${
            view === "menu" && "mr-4"
          }`}
        >
          <motion.div
            variants={iconVariants}
            animate={view === "menu" ? "active" : "inactive"}
          >
            <CiMenuFries className="text-white" />
          </motion.div>

          <AnimatePresence mode="wait">
            {view === "menu" && (
              <motion.span
                className="text-white text-sm font-medium whitespace-nowrap"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                Menu
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.section>
    </motion.nav>
  );
}
