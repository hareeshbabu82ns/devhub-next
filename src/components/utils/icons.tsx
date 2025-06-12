import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BanknoteIcon,
  Bell,
  Calendar,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardIcon,
  Clock,
  CreditCard,
  Download,
  Mail as eMail,
  File,
  FileText,
  FlameIcon,
  Globe2,
  HandCoins,
  HelpCircle,
  HomeIcon,
  Image,
  Laptop,
  Loader2,
  LoaderPinwheel as loaderWheel,
  LockKeyholeIcon,
  LogOut,
  type Icon as LucideIcon,
  LucideProps,
  Map,
  Moon,
  MoreHorizontal,
  MoreVertical,
  NotebookPen,
  Pencil,
  Phone,
  Pizza,
  Plus,
  RefreshCcw,
  SaveIcon,
  Search as search,
  Settings,
  SlidersVertical,
  SunMedium,
  TimerResetIcon,
  Trash2 as Trash,
  Upload,
  User,
  ServerCrash,
  Users2 as Users,
  X,
  Bookmark,
  BookmarkCheck,
  Heart,
} from "lucide-react";

// https://react-icons.github.io/react-icons/
import {
  FaIndianRupeeSign,
  FaCalculator,
  FaAtom,
  FaPersonRays,
} from "react-icons/fa6";

import {
  MdArchive,
  MdBatchPrediction,
  MdCode,
  MdSkipPrevious as PrevIcon,
  MdSkipNext as NextIcon,
  MdOutlineFastForward as ForwardIcon,
  MdOutlineFastRewind as RewindIcon,
  MdOutlinePlayCircle as PlayIcon,
  MdOutlinePauseCircle as PauseIcon,
  MdOutlineRepeat as RepeatIcon,
  MdOutlineRepeatOn as RepeatOnIcon,
  MdOutlinePlaylistRemove as ClearIcon,
} from "react-icons/md";
import { PiArrowsSplitFill, PiFiles } from "react-icons/pi";

export type Icon = typeof LucideIcon;

export const Icons = {
  logo: ({ ...props }: LucideProps) => (
    <svg
      version="1.1"
      viewBox="24 24 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <g fill="currentColor" stroke="none">
        <path d="m26.247 46.769c-0.20287-0.18704-0.24672-0.34505-0.24672-0.889 0-0.57132 0.03798-0.69442 0.27852-0.90276 0.20392-0.17662 0.40148-0.24124 0.73757-0.24124h0.45905v-5.9951h-0.49084c-0.7393 0-0.98429-0.27348-0.98429-1.0987 0-0.50251 0.05162-0.70064 0.23518-0.90276l0.23518-0.25896h2.2045c1.2125 0 2.2045-0.03573 2.2045-0.07942 0-0.39286 1.0641-5.7786 1.2124-6.1358 0.44322-1.0682 1.6888-2.041 2.8882-2.2556l0.65945-0.11797 0.03128-1.4305c0.03018-1.38 0.0399-1.4316 0.27575-1.4607 0.24615-0.03038 2.457 0.87245 2.5888 1.0572 0.1512 0.2119-0.18517 0.4644-1.182 0.88727-0.92584 0.39277-1.0337 0.46612-1.0039 0.68269 0.02791 0.20272 0.14027 0.27002 0.68291 0.40906 0.86012 0.22039 1.5438 0.57742 2.068 1.08 0.75741 0.72613 0.91123 1.1723 1.4737 4.275 0.28487 1.5715 0.51795 2.9094 0.51795 2.973 0 0.08466 0.57443 0.11569 2.1407 0.11569 1.9938 0 2.1612 0.01397 2.4396 0.2037 0.27057 0.18434 0.29898 0.26714 0.29898 0.87127 0 0.86291-0.24925 1.1855-0.91601 1.1855h-0.44565v5.9951h0.34788c0.36563 0 0.78624 0.15161 0.92695 0.33412 0.04585 0.05947 0.08415 0.42878 0.0851 0.82068 3e-3 1.2264 1.0912 1.1057-9.964 1.1057h-9.5119zm5.1778-2.4507 0.03458-0.46683h-1.3741v0.99262l1.3049-0.05896zm10.462 0.02458v-0.4914h-1.3617v0.42588c0 0.23424 0.03405 0.45537 0.07565 0.49141 0.0416 0.03604 0.34798 0.06552 0.68083 0.06552h0.60518zm-12.595-2.6044v-2.9976h-1.0212v5.9951h1.0212zm4.7658 0.89166v-2.1059l0.31004-0.21123c0.28556-0.19456 0.41899-0.20869 1.6905-0.17912 1.9765 0.04596 1.8575-0.11454 1.8575 2.5044v2.0978h1.8155v-5.9951h-7.6026v5.9951h1.929zm9.6451-0.89166v-2.9976h-1.0212v5.9951h1.0212zm-12.255 0.88452v-0.54055h-1.3617v1.0811h1.3617zm10.439 0v-0.54055h-1.3617v1.0811h1.3617zm-10.462-1.7445-0.0343-0.51598-1.3049-0.05896v1.0909h1.3735zm10.462-0.02457v-0.54055h-1.3617v1.0811h1.3617zm-10.462-1.5971-0.03458-0.46684-1.3049-0.05896v0.99262h1.3741zm10.462-0.07371v-0.44226h-1.3617v0.88453h1.3617zm-7.3638-4.6929 0.27186-1.9902-1.178-0.02801c-0.6479-0.01541-1.1959-0.01252-1.2178 0.0064-0.03921 0.03394-0.7247 3.733-0.7247 3.9105 0 0.05104 0.56934 0.09145 1.2884 0.09145h1.2884zm5.7752 1.845c0-0.07986-0.15319-0.95055-0.34042-1.9349-0.18723-0.98432-0.34042-1.8256-0.34042-1.8696 0-0.04395-0.53616-0.07989-1.1915-0.07989-1.1282 0-1.1915 0.01078-1.1915 0.20292 0 0.23165 0.4365 3.27 0.51798 3.6055 0.05175 0.21307 0.09912 0.22113 1.2997 0.22113 1.0234 0 1.246-0.02594 1.246-0.14519zm-1.0212-5.5358c0-0.38112-0.60476-1.2197-1.1477-1.5914-0.70369-0.48177-1.2229-0.63421-2.143-0.62922-1.5346 0.0084-2.8811 0.86618-3.2879 2.0948l-0.10037 0.30312h3.3395c3.1427 0 3.3395-0.01048 3.3395-0.17727z" />
      </g>
    </svg>
  ),
  loaderWheel,
  home: HomeIcon,
  pooja: FlameIcon,
  clipboard: ClipboardIcon,
  bookmark: Bookmark,
  bookmarkCheck: BookmarkCheck,
  god: FaAtom,
  artist: FaPersonRays,
  dictionary: MdBatchPrediction,
  sanscript: MdCode,
  assetsExplorer: PiFiles,
  users: Users,
  phone: Phone,
  email: eMail,
  save: SaveIcon,
  refresh: RefreshCcw,
  reset: TimerResetIcon,
  notifications: Bell,
  booking: NotebookPen,
  map: Map,
  globe: Globe2,
  close: X,
  clock: Clock,
  calendar: Calendar,
  confirmed: CalendarCheck,
  paid: HandCoins,
  spinner: Loader2,
  back: ChevronLeft,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  moreHorizontal: MoreHorizontal,
  search,
  trash: Trash,
  post: FileText,
  page: File,
  media: Image,
  settings: Settings,
  settingsSliders: SlidersVertical,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  edit: Pencil,
  warning: AlertTriangle,
  user: User,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  help: HelpCircle,
  pizza: Pizza,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  logout: LogOut,
  login: LockKeyholeIcon,
  upload: Upload,
  download: Download,
  heart: Heart,

  play: PlayIcon,
  pause: PauseIcon,
  next: NextIcon,
  prev: PrevIcon,
  forward: ForwardIcon,
  rewind: RewindIcon,
  repeat: RepeatIcon,
  repeatOn: RepeatOnIcon,
  clear: ClearIcon,

  split: PiArrowsSplitFill,
  archive: MdArchive,
  expenses: BanknoteIcon,
  accounts: ({ ...props }: LucideProps) => (
    <svg
      className="size-6 text-gray-800 dark:text-white"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 10h18M6 14h2m3 0h5M3 7v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z"
      />
    </svg>
  ),
  transactions: FaIndianRupeeSign,
  calculate: FaCalculator,

  sidebarMenu: ({ ...props }: LucideProps) => (
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
        clipRule="evenodd"
      ></path>
    </svg>
  ),
  facebook: ({ ...props }: LucideProps) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="facebook"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      viewBox="0 0 8 19"
      {...props}
    >
      <path
        fillRule="evenodd"
        d="M6.135 3H8V0H6.135a4.147 4.147 0 0 0-4.142 4.142V6H0v3h2v9.938h3V9h2.021l.592-3H5V3.591A.6.6 0 0 1 5.592 3h.543Z"
        clipRule="evenodd"
      />
    </svg>
  ),
  gitHub: ({ ...props }: LucideProps) => (
    <svg
      aria-hidden="true"
      focusable="false"
      data-prefix="fab"
      data-icon="github"
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 496 512"
      {...props}
    >
      <path
        fill="currentColor"
        d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3 .3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5 .3-6.2 2.3zm44.2-1.7c-2.9 .7-4.9 2.6-4.6 4.9 .3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3 .7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3 .3 2.9 2.3 3.9 1.6 1 3.6 .7 4.3-.7 .7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3 .7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3 .7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"
      ></path>
    </svg>
  ),
  check: Check,
  scraper: ServerCrash,
};
