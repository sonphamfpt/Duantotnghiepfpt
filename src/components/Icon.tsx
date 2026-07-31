import React from 'react';
import type { IconType } from 'react-icons';
import {
  MdSearch,
  MdClose,
  MdCalendarMonth,
  MdVerified,
  MdStar,
  MdInfo,
  MdArrowForward,
  MdArrowBack,
  MdCheckCircle,
  MdSchedule,
  MdLogout,
  MdAndroid,
  MdMonitor,
  MdEmail,
  MdPhone,
  MdCheck,
  MdEventNote,
  MdNotifications,
  MdLocalOffer,
  MdMedicalServices,
  MdHealthAndSafety,
  MdSchool,
  MdWork,
  MdError,
  MdEventAvailable,
  MdEventBusy,
  MdPerson,
  MdPayments,
  MdTaskAlt,
  MdHistory,
  MdFolderShared,
  MdPieChart,
  MdTouchApp,
  MdPrint,
  MdTimer,
  MdQrCode2,
  MdRefresh,
  MdHourglassEmpty,
  MdHourglassTop,
  MdWarning,
  MdFavoriteBorder,
  MdFeedback,
  MdMeetingRoom,
  MdQrCode,
  MdCameraAlt,
  MdAppRegistration,
  MdAdminPanelSettings,
  MdManageAccounts,
  MdElectricBolt,
  MdPeople,
  MdReceiptLong,
  MdReceipt,
  MdGrid3X3,
  MdImage,
  MdDescription,
  MdMap,
  MdSend,
  MdSearchOff,
  MdUpcoming,
  MdNotificationsActive,
  MdPsychology,
  MdChevronRight,
  MdChevronLeft,
  MdBiotech,
  MdStars,
  MdPublic,
  MdVpnLock,
  MdCardGiftcard,
  MdLocationOn,
  MdAssignment,
  MdStickyNote2,
  MdSpeakerNotes,
  MdPersonAdd,
  MdPictureAsPdf,
  MdGroup,
  MdGroupAdd,
  MdBlock,
  MdPersonSearch,
  MdInventory2,
  MdTrendingUp,
  MdTrendingDown,
  MdVisibility,
  MdEvent,
  MdDoneAll,
  MdDraw,
  MdComment,
  MdAssignmentAdd,
  MdAssignmentTurnedIn,
  MdHistoryToggleOff,
  MdLogin,
  MdInsights,
  MdBorderColor,
  MdVaccines,
  MdTipsAndUpdates,
  MdSupportAgent,
  MdLightMode,
  MdWbTwilight,
  MdAddCircle,
  MdNotificationImportant,
  MdFilterAltOff,
  MdCancel,
  MdViewTimeline,
  MdCampaign,
  MdQueuePlayNext,
  MdArticle,
  MdPreview,
  MdScheduleSend,
  MdDownload,
  MdFolderOpen,
  MdNoteAlt,
  MdVerifiedUser,
  MdLock,
  MdSwapHoriz,
  MdCreditCard,
  MdFilterList,
  MdWallet,
  MdAccountBalance,
  MdOpenInFull,
  MdEventSeat,
  MdDone,
  MdQueue,
  MdFlag,
  MdInbox,
  MdPlaylistRemove,
  MdSettings,
  MdAdd,
  MdAddBox,
  MdHistoryEdu,
  MdTerminal,
  MdKeyboardArrowDown,
  MdPhotoCameraBack,
  MdZoomIn,
  MdZoomOut,
  MdRestartAlt,
  MdRotateRight,
  MdAutorenew,
  MdReplay,
  MdRecordVoiceOver,
  MdMonitorHeart,
  MdHealing,
  MdRateReview,
  MdAirlineSeatReclineNormal,
  MdEditCalendar,
  MdCheckBox,
  MdPlayArrow,
  MdDashboard,
  MdStarBorder,
  MdVisibilityOff,
  MdDelete,
  MdWorkspacePremium,
  MdSecurity,
  MdSpa,
  MdAccessibility,
  MdCleaningServices,
  MdConstruction,
  MdScience,
  MdDiamond,
  MdMilitaryTech,
  MdCleanHands,
  MdBrightnessHigh,
  MdRebaseEdit,
  MdGridView,
  MdChildCare,
  MdLensBlur,
  MdImageSearch,
} from 'react-icons/md';

export type IconName =
  | 'search'
  | 'close'
  | 'calendar_month'
  | 'verified'
  | 'star'
  | 'info'
  | 'arrow_forward'
  | 'arrow_back'
  | 'check_circle'
  | 'schedule'
  | 'logout'
  | 'smart_toy'
  | 'monitor'
  | 'mail'
  | 'call'
  | 'check'
  | 'pending_actions'
  | 'event_note'
  | 'notifications'
  | 'local_offer'
  | 'medical_services'
  | 'dentistry'
  | 'health_and_safety'
  | 'school'
  | 'work'
  | 'error'
  | 'event_available'
  | 'event_busy'
  | 'person'
  | 'payments'
  | 'task_alt'
  | 'history'
  | 'folder_shared'
  | 'pie_chart'
  | 'touch_app'
  | 'stethoscope'
  | 'print'
  | 'timer'
  | 'qr_code_2'
  | 'update'
  | 'hourglass_empty'
  | 'hourglass_top'
  | 'warning'
  | 'favorite'
  | 'feedback'
  | 'meeting_room'
  | 'qr_code_scanner'
  | 'camera_alt'
  | 'how_to_reg'
  | 'admin_panel_settings'
  | 'flash_on'
  | 'target'
  | 'groups'
  | 'receipt_long'
  | 'receipt'
  | 'grid_on'
  | 'image'
  | 'description'
  | 'map'
  | 'send'
  | 'search_off'
  | 'event_upcoming'
  | 'notifications_active'
  | 'psychology'
  | 'chevron_right'
  | 'chevron_left'
  | 'biotech'
  | 'stars'
  | 'public'
  | 'encrypted'
  | 'card_giftcard'
  | 'location_on'
  | 'assignment'
  | 'sticky_note_2'
  | 'speaker_notes'
  | 'person_add'
  | 'picture_as_pdf'
  | 'group'
  | 'group_add'
  | 'block'
  | 'person_search'
  | 'inventory_2'
  | 'monitor_heart'
  | 'calendar_today'
  | 'calendar_add_on'
  | 'email'
  | 'trending_up'
  | 'trending_down'
  | 'medical_information'
  | 'emergency'
  | 'visibility'
  | 'event'
  | 'done_all'
  | 'draw'
  | 'chat_bubble'
  | 'assignment_add'
  | 'assignment_turned_in'
  | 'lock_clock'
  | 'login'
  | 'analytics'
  | 'border_color'
  | 'medication'
  | 'tips_and_updates'
  | 'record_voice_over'
  | 'vital_signs'
  | 'healing'
  | 'progress_activity'
  | 'replay'
  | 'rate_review'
  | 'airline_seat_recline_normal'
  | 'route'
  | 'edit_calendar'
  | 'support_agent'
  | 'light_mode'
  | 'wb_twilight'
  | 'add_circle'
  | 'notification_important'
  | 'filter_alt_off'
  | 'cancel'
  | 'view_timeline'
  | 'campaign'
  | 'queue_play_next'
  | 'article'
  | 'preview'
  | 'refresh'
  | 'schedule_send'
  | 'download'
  | 'folder_open'
  | 'clinical_notes'
  | 'verified_user'
  | 'lock'
  | 'swap_horiz'
  | 'credit_card'
  | 'filter_list'
  | 'wallet'
  | 'account_balance'
  | 'open_in_full'
  | 'event_seat'
  | 'done'
  | 'queue'
  | 'flag'
  | 'inbox'
  | 'playlist_remove'
  | 'settings'
  | 'add'
  | 'add_box'
  | 'history_edu'
  | 'terminal'
  | 'keyboard_arrow_down'
  | 'photo_camera_back'
  | 'zoom_in'
  | 'zoom_out'
  | 'restart_alt'
  | 'rotate_right'
  | 'expand_more'
  | 'remove'
  | 'play_arrow'
  | 'dashboard'
  | 'star_border'
  | 'visibility_off'
  | 'delete'
  | 'workspace_premium'
  | 'security'
  | 'spa'
  | 'accessibility'
  | 'cleaning_services'
  | 'construction'
  | 'science'
  | 'diamond'
  | 'military_tech'
  | 'clean_hands'
  | 'brightness_high'
  | 'rebase'
  | 'grid_view'
  | 'child_care'
  | 'lens_blur'
  | 'image_search';

const ICON_MAP: Record<IconName, IconType> = {
  search: MdSearch,
  close: MdClose,
  calendar_month: MdCalendarMonth,
  verified: MdVerified,
  star: MdStar,
  info: MdInfo,
  arrow_forward: MdArrowForward,
  arrow_back: MdArrowBack,
  check_circle: MdCheckCircle,
  schedule: MdSchedule,
  logout: MdLogout,
  smart_toy: MdAndroid,
  monitor: MdMonitor,
  mail: MdEmail,
  call: MdPhone,
  check: MdCheck,
  pending_actions: MdCheckBox,
  event_note: MdEventNote,
  notifications: MdNotifications,
  local_offer: MdLocalOffer,
  medical_services: MdMedicalServices,
  dentistry: MdMedicalServices,
  health_and_safety: MdHealthAndSafety,
  school: MdSchool,
  work: MdWork,
  error: MdError,
  event_available: MdEventAvailable,
  event_busy: MdEventBusy,
  person: MdPerson,
  payments: MdPayments,
  task_alt: MdTaskAlt,
  history: MdHistory,
  folder_shared: MdFolderShared,
  pie_chart: MdPieChart,
  touch_app: MdTouchApp,
  stethoscope: MdHealthAndSafety,
  print: MdPrint,
  timer: MdTimer,
  qr_code_2: MdQrCode2,
  update: MdRefresh,
  hourglass_empty: MdHourglassEmpty,
  hourglass_top: MdHourglassTop,
  warning: MdWarning,
  favorite: MdFavoriteBorder,
  feedback: MdFeedback,
  meeting_room: MdMeetingRoom,
  qr_code_scanner: MdQrCode,
  camera_alt: MdCameraAlt,
  how_to_reg: MdAppRegistration,
  admin_panel_settings: MdAdminPanelSettings,
  flash_on: MdElectricBolt,
  target: MdInsights,
  groups: MdPeople,
  receipt_long: MdReceiptLong,
  receipt: MdReceipt,
  grid_on: MdGrid3X3,
  image: MdImage,
  description: MdDescription,
  map: MdMap,
  send: MdSend,
  search_off: MdSearchOff,
  event_upcoming: MdUpcoming,
  notifications_active: MdNotificationsActive,
  psychology: MdPsychology,
  chevron_right: MdChevronRight,
  chevron_left: MdChevronLeft,
  biotech: MdBiotech,
  stars: MdStars,
  public: MdPublic,
  encrypted: MdVpnLock,
  card_giftcard: MdCardGiftcard,
  location_on: MdLocationOn,
  assignment: MdAssignment,
  sticky_note_2: MdStickyNote2,
  speaker_notes: MdSpeakerNotes,
  person_add: MdPersonAdd,
  picture_as_pdf: MdPictureAsPdf,
  group: MdGroup,
  group_add: MdGroupAdd,
  block: MdBlock,
  person_search: MdPersonSearch,
  inventory_2: MdInventory2,
  monitor_heart: MdMonitorHeart,
  calendar_today: MdCalendarMonth,
  calendar_add_on: MdCalendarMonth,
  email: MdEmail,
  trending_up: MdTrendingUp,
  trending_down: MdTrendingDown,
  medical_information: MdHealthAndSafety,
  emergency: MdError,
  visibility: MdVisibility,
  event: MdEvent,
  done_all: MdDoneAll,
  draw: MdDraw,
  chat_bubble: MdComment,
  assignment_add: MdAssignmentAdd,
  assignment_turned_in: MdAssignmentTurnedIn,
  lock_clock: MdHistoryToggleOff,
  login: MdLogin,
  analytics: MdInsights,
  border_color: MdBorderColor,
  medication: MdVaccines,
  tips_and_updates: MdTipsAndUpdates,
  record_voice_over: MdRecordVoiceOver,
  vital_signs: MdMonitorHeart,
  healing: MdHealing,
  progress_activity: MdAutorenew,
  replay: MdReplay,
  rate_review: MdRateReview,
  airline_seat_recline_normal: MdAirlineSeatReclineNormal,
  route: MdArrowForward,
  edit_calendar: MdEditCalendar,
  support_agent: MdSupportAgent,
  light_mode: MdLightMode,
  wb_twilight: MdWbTwilight,
  add_circle: MdAddCircle,
  notification_important: MdNotificationImportant,
  filter_alt_off: MdFilterAltOff,
  cancel: MdCancel,
  view_timeline: MdViewTimeline,
  campaign: MdCampaign,
  queue_play_next: MdQueuePlayNext,
  article: MdArticle,
  preview: MdPreview,
  refresh: MdRefresh,
  schedule_send: MdScheduleSend,
  download: MdDownload,
  folder_open: MdFolderOpen,
  clinical_notes: MdNoteAlt,
  verified_user: MdVerifiedUser,
  lock: MdLock,
  swap_horiz: MdSwapHoriz,
  credit_card: MdCreditCard,
  filter_list: MdFilterList,
  wallet: MdWallet,
  account_balance: MdAccountBalance,
  open_in_full: MdOpenInFull,
  event_seat: MdEventSeat,
  done: MdDone,
  queue: MdQueue,
  flag: MdFlag,
  inbox: MdInbox,
  playlist_remove: MdPlaylistRemove,
  settings: MdSettings,
  manage_accounts: MdManageAccounts,
  add: MdAdd,
  add_box: MdAddBox,
  history_edu: MdHistoryEdu,
  terminal: MdTerminal,
  keyboard_arrow_down: MdKeyboardArrowDown,
  photo_camera_back: MdPhotoCameraBack,
  zoom_in: MdZoomIn,
  zoom_out: MdZoomOut,
  restart_alt: MdRestartAlt,
  rotate_right: MdRotateRight,
  expand_more: MdKeyboardArrowDown,
  remove: MdClose,
  play_arrow: MdPlayArrow,
  dashboard: MdDashboard,
  star_border: MdStarBorder,
  visibility_off: MdVisibilityOff,
  delete: MdDelete,
  workspace_premium: MdWorkspacePremium,
  security: MdSecurity,
  spa: MdSpa,
  accessibility: MdAccessibility,
  cleaning_services: MdCleaningServices,
  construction: MdConstruction,
  science: MdScience,
  diamond: MdDiamond,
  military_tech: MdMilitaryTech,
  clean_hands: MdCleanHands,
  brightness_high: MdBrightnessHigh,
  rebase: MdRebaseEdit,
  grid_view: MdGridView,
  child_care: MdChildCare,
  lens_blur: MdLensBlur,
  image_search: MdImageSearch,
};

export interface IconProps {
  name: IconName | string;
  className?: string;
  size?: number | string;
}

export const Icon: React.FC<IconProps> = ({ name, className = '', size }) => {
  const IconComponent = ICON_MAP[name as IconName];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return <IconComponent className={className || undefined} size={size} />;
};
