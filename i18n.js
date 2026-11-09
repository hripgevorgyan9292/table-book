// ---------- Թարգմանություններ (հայերեն, ռուսերեն, անգլերեն) ----------

// Ռուսերենում բառի ձևը կախված է թվից. 1 гость, 2 гостя, 5 гостей
function ruPlural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const MONTHS_HY = ["հունվարի", "փետրվարի", "մարտի", "ապրիլի", "մայիսի", "հունիսի",
  "հուլիսի", "օգոստոսի", "սեպտեմբերի", "հոկտեմբերի", "նոյեմբերի", "դեկտեմբերի"];
const MONTHS_RU = ["января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const TRANSLATIONS = {
  hy: {
    pageTitle: "Table Book — սեղանների ամրագրում",
    langAria: "Լեզու",
    navHow: "Քայլեր",
    navFeatures: "Հնարավորություններ",
    themeDark: "Մուգ",
    themeLight: "Բաց",
    login: "Մուտք",
    signup: "Գրանցվել",
    logout: "Ելք",

    heroTitle: "TableBook",
    heroText: "Պարզ գործիք, որով հյուրերը կարող են առցանց ամրագրել սեղան, իսկ սրճարանը՝ հեշտությամբ կառավարել ամրագրումները մեկ տեղից։",

    bookingTitle: "Ռեստորանի ամրագրում",
    guideTitle: "Ուղեցույց",
    hallTab: "Սրահ",
    chooseRestaurant: "Ընտրեք ռեստորանը ցուցակից։",
    restaurantListAll: "Բոլոր ռեստորանները",
    restaurantListLess: "Ավելի քիչ ռեստորաններ",
    bookingLead: "Ընտրեք ռեստորանը, օրը, ժամը և հյուրերի քանակը, ապա սրահի սխեմայում՝ ազատ սեղաններից մեկը։ Յուրաքանչյուր ամրագրում 1 ժամ է։",
    labelRestaurant: "Ռեստորան",
    labelDate: "Օր",
    labelTime: "Ժամ",
    labelGuests: "Հյուրեր",
    findTable: "Գտնել ազատ սեղան",
    legendFree: "Ազատ",
    legendSelected: "Ընտրված",
    legendBusy: "Զբաղված",
    legendSmall: "Փոքր է ձեր խմբի համար",
    hallWindows: "Պատուհաններ",
    hallBar: "Բար",
    hallDoor: "Մուտք",
    panelChoose: "Ընտրեք սեղան",
    panelChooseText: "Սեղմեք սխեմայում ազատ սեղաններից մեկի վրա՝ մանրամասները տեսնելու համար։",
    factSeats: "Տեղեր",
    factDate: "Օր",
    factTime: "Ժամ",
    factGuests: "Հյուրեր",
    bookNow: "Ամրագրել",


    howTitle: "Քայլեր",
    howLead: "Ամրագրումը տևում է ընդամենը մի քանի քայլ։",
    how1Title: "Ընտրեք ժամը",
    how1Text: "Կայքում ընտրում է ցանկալի ամսաթիվը, ժամը և հյուրերի քանակը։",
    how2Title: "Ընտրեք սեղանը",
    how2Text: "Ծրագիրը ցույց է տալիս միայն այն սեղանները, որոնք ազատ են ընտրված ժամին։",
    how3Title: "Լրացրեք տվյալները",
    how3Text: "Նշում է անունը և հեռախոսահամարը, ապա հաստատում ամրագրումը։",
    how4Title: "Սրճարանը հաստատում է",
    how4Text: "Ամրագրումն անմիջապես հայտնվում է սրճարանի կառավարման էջում, որտեղ այն կարելի է հաստատել կամ չեղարկել։",

    featTitle: "Հնարավորություններ",
    feat1Title: "Առցանց ամրագրում",
    feat1Text: "Հյուրերը կարող են սեղան ամրագրել օրվա ցանկացած ժամի։",
    feat2Title: "Սեղաններ",
    feat2Text: "Ավելացրեք սեղաններ, նշեք նստատեղերի քանակը և տեղադրությունը։",
    feat3Title: "Առանց կրկնակի ամրագրման",
    feat3Text: "Համակարգը թույլ չի տալիս նույն սեղանը կրկնակի ամրագրել նույն ժամին։",
    feat4Title: "Ամրագրումների ցուցակ",
    feat4Text: "Օրվա բոլոր ամրագրումները մեկ էջում՝ ըստ ժամի դասավորված։",
    feat5Title: "Հաստատում և չեղարկում",
    feat5Text: "Սրճարանը կարող է հաստատել, փոխել կամ չեղարկել ցանկացած ամրագրում։",
    feat6Title: "Ցանկացած սարքում",
    feat6Text: "Աշխատում է համակարգչում, պլանշետում և հեռախոսում, բաց և մուգ ռեժիմներով։",

    closeAria: "Փակել",
    signupTitle: "Գրանցում",
    labelFirstName: "Անուն",
    labelLastName: "Ազգանուն",
    labelEmail: "Email",
    labelPassword: "Գաղտնաբառ",
    labelPasswordConfirm: "Կրկնեք գաղտնաբառը",
    signupSubmit: "Գրանցվել",
    haveAccount: "Արդեն ունե՞ք հաշիվ։",
    loginLink: "Մուտք գործել",
    loginTitle: "Մուտք",
    loginSubmit: "Մուտք գործել",
    noAccount: "Դեռ հաշիվ չունե՞ք։",
    signupLink: "Գրանցվել",

    footerText: "TableBook · Սեղանների ամրագրման համակարգ",

    errFirstName: "Գրեք ձեր անունը",
    errLastName: "Գրեք ձեր ազգանունը",
    errEmailEmpty: "Գրեք ձեր email-ը",
    errEmailInvalid: "Email-ը սխալ է գրված",
    errPasswordEmpty: "Գրեք գաղտնաբառ",
    errPasswordShort: "Գաղտնաբառը պետք է լինի առնվազն 6 նիշ",
    errPasswordConfirmEmpty: "Կրկնեք գաղտնաբառը",
    errPasswordMismatch: "Գաղտնաբառերը չեն համընկնում",
    errLoginPassword: "Գրեք գաղտնաբառը",
    networkError: "Չհաջողվեց կապվել սերվերի հետ։ Փորձեք կրկին։",
    welcome: "Բարի գալուստ, {name}։ Գրանցումը հաջողվեց։",
    welcomeBack: "Բարի վերադարձ, {name}։",
    loggedOut: "Դուք դուրս եկաք հաշվից։",

    guestsOption: ({ n }) => n + " հոգի",
    seatsShort: ({ n }) => n + " տեղ",
    tableN: "Սեղան {n}",
    stateFree: "ազատ է",
    stateBusy: "զբաղված է",
    stateSmall: "փոքր է ձեր խմբի համար",
    statusFree: "Ձեր խմբի համար ազատ է {n} սեղան։ Ընտրեք սխեմայում։",
    statusNone: "Այս ժամին ձեր խմբի համար ազատ սեղան չկա։ Փորձեք այլ ժամ կամ օր։",
    statusChooseDay: "Ընտրեք օրը։",
    statusChooseRestaurant: "Ընտրեք ռեստորանը։",
    statusLoading: "Թարմացնում ենք սրահի սխեման…",
    askLogin: "Ամրագրելու համար մուտք գործեք կամ գրանցվեք։",
    booked: "{restaurant}, սեղան {n}-ը ամրագրված է {date}, {time}։",
    formatDate: ({ day, month }) => day + " " + MONTHS_HY[month],

    zoneWindow: "Պատուհանի մոտ",
    zoneCenter: "Սրահի կենտրոն",
    zoneSofa: "Բազմոցի անկյուն",
    zoneBig: "Մեծ սեղան",
    zoneHall: "Սրահ",
    desc1: "Լուսավոր անկյուն՝ փողոցի տեսարանով։ Հարմար է երկուսով սուրճ խմելու համար։",
    desc2: "Ցերեկը՝ արևոտ սեղան մեծ պատուհանի դիմաց։",
    desc3: "Բարին մոտ հանգիստ սեղան՝ զրույցի համար։",
    desc4: "Հարմար է փոքր ընկերական հանդիպումների համար։",
    desc5: "Սրահի մեջտեղում՝ մոտ բարին և պատուհաններին։",
    desc6: "Բարի կողքին՝ արագ սպասարկման համար։",
    desc7: "Փափուկ բազմոցով հանգիստ անկյուն։",
    desc8: "Երկար փայտե սեղան՝ ընտանեկան կամ աշխատանքային հավաքների համար։",

    errEmailTaken: "Այս email-ով արդեն գրանցված օգտատեր կա",
    errLoginWrong: "Email-ը կամ գաղտնաբառը սխալ է",
    errDateTime: "Նշեք ճիշտ օր և ժամ",
    errLoginRequired: "Մուտք գործեք",
    errLoginToBook: "Ամրագրելու համար մուտք գործեք",
    errPastTime: "Անցած ժամի համար ամրագրել հնարավոր չէ",
    errGuests: "Նշեք հյուրերի քանակը",
    errNoTable: "Այդպիսի սեղան չկա",
    errMaxSeats: "Այս սեղանին տեղավորվում է առավելագույնը {n} հոգի",
    errTableBusy: "Այս սեղանն այդ ժամին արդեն զբաղված է",
    errServer: "Սերվերի սխալ, փորձեք կրկին",
    errNoReservation: "Այդպիսի ամրագրում չկա",
    errAlreadyCancelled: "Ամրագրումն արդեն չեղարկված է",
    errCancelTooLate: "Ամրագրումը կարելի է չեղարկել առնվազն 1 ժամ առաջ",
    errClosing: "Ամրագրումը պետք է ավարտվի մինչև 23:00",

    myBookingsTitle: "Իմ ամրագրումները",
    myBookingsEmpty: "Դուք դեռ ամրագրումներ չունեք։",
    newBookingBtn: "+ Նոր ամրագրում",
    msgPending: "Սպասում ենք ռեստորանի հաստատմանը։",
    msgConfirmed: "Ռեստորանը հաստատեց ձեր ամրագրումը։ Սպասում ենք ձեզ։",
    msgRejected: "Ռեստորանը մերժեց ամրագրումը։ Հաղորդագրություն՝",
    msgCancelled: "Դուք չեղարկել եք այս ամրագրումը։",
    msgAnswered: "Ռեստորանը պատասխանեց ձեր ամրագրմանը։",
    cancelRule: "Ամրագրումը կարելի է չեղարկել առնվազն 1 ժամ առաջ։",
    statusPending: "Սպասում է",
    statusConfirmed: "Հաստատված",
    statusCancelled: "Չեղարկված",
    cancelBtn: "Չեղարկել",
    cancelConfirm: "Չեղարկե՞լ սեղան {n}-ի ամրագրումը ({date}, {time})։",
    cancelled: "Ամրագրումը չեղարկվեց։",
    cancelTooLate: "Չեղարկել այլևս հնարավոր չէ",

    restaurantsTitle: "Ռեստորաններ",
    restaurantsLead: "Ընտրեք, թե ուր կցանկանայիք գնալ։",
    restaurantsEmpty: "Ռեստորաններ դեռ չկան։",
    addRestaurant: "+ Ավելացնել ռեստորան",
    bookTableBtn: "Ամրագրել սեղան",
    editBtn: "Փոխել",
    deleteBtn: "Ջնջել",
    restaurantFormAdd: "Նոր ռեստորան",
    restaurantFormEdit: "Փոխել ռեստորանը",
    labelName: "Անվանում",
    labelCuisine: "Խոհանոց",
    labelAddress: "Հասցե",
    labelDescription: "Նկարագրություն",
    labelImage: "Լուսանկարի հղում (https://…)",
    saveBtn: "Պահպանել",
    restaurantSaved: "Ռեստորանը պահպանվեց։",
    restaurantDeleted: "Ռեստորանը ջնջվեց։",
    deleteConfirm: "Ջնջե՞լ «{name}» ռեստորանը։",
    errName: "Գրեք ռեստորանի անվանումը",
    labelCity: "Քաղաք",
    allCities: "Բոլոր քաղաքները",
    noRestaurantsInCity: "Այս քաղաքում դեռ ռեստորաններ չկան։",
    errCity: "Ընտրեք քաղաքը",
    dishAdd: "Ընտրել",
    dishMore: "Ավելացնել մեկ «{name}»",
    dishLess: "Հանել մեկ «{name}»",
    orderTitle: "Ձեր պատվերը",
    orderAdd: "+ Ընտրել ուտեստներ",
    orderChange: "Փոխել",
    orderClear: "Մաքրել",
    orderTotal: "Ընդամենը՝ {total}",
    orderSummary: "Ընդամենը՝ {n} ուտեստ · {total}",
    orderRemove: "Հանել «{name}»-ը պատվերից",
    bookWithOrder: "Ամրագրել սեղան այս պատվերով",
    errOrder: "Պատվերը սխալ է",
    errOrderDish: "Ճաշացանկում այդպիսի ուտեստ չկա",
    menuBtn: "Ճաշացանկ",
    menuAll: "Բոլորը",
    menuEmpty: "Ճաշացանկը դեռ պատրաստ չէ։",
    menuEmptyAdmin: "Ուտեստներ դեռ չկան։ Ավելացրեք առաջինը ներքևի ձևով։",
    dishFormAdd: "Նոր ուտեստ",
    dishFormEdit: "Փոխել՝ {name}",
    menuEditorTitle: "Ճաշացանկ՝ {name}",
    menuDishCount: "{n} ուտեստ",
    menuCat_starters: "Նախուտեստներ",
    menuCat_salads: "Աղցաններ",
    menuCat_soups: "Ապուրներ",
    menuCat_mains: "Հիմնական ուտեստներ",
    menuCat_grill: "Խորոված և գրիլ",
    menuCat_desserts: "Աղանդեր",
    menuCat_drinks: "Ըմպելիքներ",
    labelCategory: "Բաժին",
    labelPrice: "Գին, ֏",
    labelDishName: "Ուտեստ",
    labelDishDescription: "Նկարագրություն",
    labelDishImage: "Ուտեստի նկարի հղում (https://…)",
    bookingsCount: "{n} ամրագրում",
    newBookings: "{n} նոր",
    cityUnknown: "Առանց քաղաքի",
    addDish: "Ավելացնել ուտեստ",
    saveDish: "Պահպանել փոփոխությունը",
    cancelEdit: "Չեղարկել",
    dishAdded: "Ուտեստն ավելացվեց։",
    dishSaved: "Ուտեստը պահպանվեց։",
    dishDeleted: "Ուտեստը ջնջվեց։",
    deleteDishConfirm: "Ջնջե՞լ «{name}» ուտեստը ճաշացանկից։",
    errDishName: "Գրեք ուտեստի անվանումը",
    errPrice: "Նշեք ճիշտ գին",
    errCategory: "Ընտրեք բաժինը",
    errNoDish: "Այդպիսի ուտեստ չկա",
    restaurantSearchPlaceholder: "Որոնել ըստ անվանման, խոհանոցի, հասցեի կամ քաղաքի",
    restaurantSearchFound: "Գտնվեց՝ {n}",
    restaurantSearchNone: "Այդպիսի ռեստորան չգտնվեց։",
    importLabel: "Լցնել ռեստորանի էջից",
    importBtn: "Լցնել",
    importHint: "Տեղադրեք ռեստորանի կայքի կամ էջի հղումը, հետո ստուգեք դաշտերը և պահպանեք։",
    importLoading: "Բացում ենք էջը…",
    importDone: "Դաշտերը լցվեցին էջից։ Ստուգեք դրանք և սեղմեք «Պահպանել»։",
    importDoneNoCity: "Դաշտերը լցվեցին էջից, բայց քաղաքը չճանաչվեց։ Ընտրեք այն և սեղմեք «Պահպանել»։",
    errImportUrl: "Տեղադրեք ճիշտ հղում (https://…)",
    errImportBadUrl: "Հղումը սխալ է",
    errImportFetch: "Էջը բացել չհաջողվեց",
    errImportNoData: "Էջում ռեստորանի տվյալներ չգտնվեցին",
    errImage: "Լուսանկարի հղումը պետք է սկսվի https://-ով",
    errTooLong: "Տեքստը չափազանց երկար է",
    errAdminOnly: "Միայն ադմինը կարող է փոխել ռեստորանները",
    errNoRestaurant: "Այդպիսի ռեստորան չկա",

    adminPageTitle: "TableBook — ադմին պանել",
    adminTag: "Ադմին",
    adminPanelBtn: "Ադմին",
    mainPageBtn: "Գլխավոր էջ",
    adminLoginTitle: "Ադմինի մուտք",
    adminLoginLead: "Միայն աշխատակիցների համար։",
    accessDenied: "Մուտքն արգելված է",
    notAdminAccount: "Այս հաշիվը ադմին չէ։",
    accessDeniedText: "Այս հաշիվը ադմին չէ։ Դուրս եկեք և մուտք գործեք ադմինի հաշվով։",
    adminWelcome: "Բարի գալուստ, {name}",
    adminBookingsTitle: "Ամրագրումներ",
    adminBookingsEmpty: "Առաջիկա ամրագրումներ չկան։",
    confirmBtn: "Հաստատել",
    adminTablesTitle: "Ազատ և զբաղված սեղաններ",
    adminTablesSummary: "Ազատ՝ {free} · Զբաղված՝ {busy}",
    adminTablesSummaryDay: "Այս օրը ամրագրված է {busy} սեղան {total}-ից",
    allDay: "Ամբողջ օրը",
    freeAllDay: "Ազատ է ամբողջ օրը",
    tablesBtn: "Սեղաններ",
    bookingConfirmed: "Ամրագրումը հաստատվեց։",
    errCannotConfirm: "Չեղարկված ամրագրումը հնարավոր չէ հաստատել",
    errAccessDenied: "Մուտքն արգելված է",
    rejectBtn: "Մերժել",
    rejectTitle: "Մերժել ամրագրումը",
    rejectTemplatesLabel: "Պատրաստի պատասխաններ",
    rejectReasonLabel: "Հաղորդագրություն հյուրին",
    rejectSubmit: "Մերժել և ուղարկել",
    rejectReasonShown: "Մերժման պատճառը՝ {reason}",
    statusRejected: "Մերժված",
    bookingRejected: "Ամրագրումը մերժվեց, հաղորդագրությունն ուղարկվեց հյուրին։",
    errRejectReason: "Գրեք մերժման պատճառը",
    rejectTplBusyTitle: "Սեղանը զբաղված է",
    rejectTplBusy: "Ցավոք, այս սեղանն այդ ժամին արդեն զբաղված է։ Խնդրում ենք ընտրել այլ սեղան կամ ժամ։",
    rejectTplClosedTitle: "Փակ միջոցառում",
    rejectTplClosed: "Այդ ժամին ռեստորանում փակ միջոցառում է։ Սիրով կսպասենք ձեզ մեկ այլ օր։",
    rejectTplGuestsTitle: "Շատ հյուրեր",
    rejectTplGuests: "Հյուրերի քանակն այս սեղանի համար շատ է։ Խնդրում ենք ամրագրել ավելի մեծ սեղան։",
    rejectTplTimeTitle: "Ժամն անհասանելի է",
    rejectTplTime: "Այդ ժամի համար ամրագրումներ չենք ընդունում։ Խնդրում ենք ընտրել այլ ժամ։",
  },

  ru: {
    pageTitle: "Table Book — бронирование столиков",
    langAria: "Язык",
    navHow: "Шаги",
    navFeatures: "Возможности",
    themeDark: "Тёмная",
    themeLight: "Светлая",
    login: "Вход",
    signup: "Регистрация",
    logout: "Выйти",

    heroTitle: "TableBook",
    heroText: "Простой инструмент: гости бронируют столик онлайн, а кафе легко управляет всеми бронированиями в одном месте.",

    bookingTitle: "Бронирование ресторана",
    guideTitle: "Руководство",
    hallTab: "Зал",
    chooseRestaurant: "Выберите ресторан из списка.",
    restaurantListAll: "Все рестораны",
    restaurantListLess: "Меньше ресторанов",
    bookingLead: "Выберите ресторан, день, время и количество гостей, затем — свободный столик на схеме зала. Каждое бронирование — на 1 час.",
    labelRestaurant: "Ресторан",
    labelDate: "День",
    labelTime: "Время",
    labelGuests: "Гости",
    findTable: "Найти свободный столик",
    legendFree: "Свободен",
    legendSelected: "Выбран",
    legendBusy: "Занят",
    legendSmall: "Мал для вашей группы",
    hallWindows: "Окна",
    hallBar: "Бар",
    hallDoor: "Вход",
    panelChoose: "Выберите столик",
    panelChooseText: "Нажмите на свободный столик на схеме, чтобы увидеть подробности.",
    factSeats: "Места",
    factDate: "День",
    factTime: "Время",
    factGuests: "Гости",
    bookNow: "Забронировать",


    howTitle: "Шаги",
    howLead: "Бронирование занимает всего несколько шагов.",
    how1Title: "Выберите время",
    how1Text: "Выбирает на сайте дату, время и количество гостей.",
    how2Title: "Выберите столик",
    how2Text: "Система показывает только столики, свободные в выбранное время.",
    how3Title: "Заполните данные",
    how3Text: "Указывает имя и телефон, затем подтверждает бронь.",
    how4Title: "Кафе подтверждает",
    how4Text: "Бронь сразу появляется на странице управления кафе, где её можно подтвердить или отменить.",

    featTitle: "Возможности",
    feat1Title: "Онлайн-бронь",
    feat1Text: "Гости могут забронировать столик в любое время суток.",
    feat2Title: "Столики",
    feat2Text: "Добавляйте столики, указывайте количество мест и расположение.",
    feat3Title: "Без двойной брони",
    feat3Text: "Система не позволяет дважды забронировать один столик на одно и то же время.",
    feat4Title: "Список броней",
    feat4Text: "Все бронирования дня на одной странице, по времени.",
    feat5Title: "Подтверждение и отмена",
    feat5Text: "Кафе может подтвердить, изменить или отменить любое бронирование.",
    feat6Title: "Любое устройство",
    feat6Text: "Работает на компьютере, планшете и телефоне, в светлой и тёмной теме.",

    closeAria: "Закрыть",
    signupTitle: "Регистрация",
    labelFirstName: "Имя",
    labelLastName: "Фамилия",
    labelEmail: "Email",
    labelPassword: "Пароль",
    labelPasswordConfirm: "Повторите пароль",
    signupSubmit: "Зарегистрироваться",
    haveAccount: "Уже есть аккаунт?",
    loginLink: "Войти",
    loginTitle: "Вход",
    loginSubmit: "Войти",
    noAccount: "Ещё нет аккаунта?",
    signupLink: "Зарегистрироваться",

    footerText: "TableBook · Система бронирования столиков",

    errFirstName: "Введите имя",
    errLastName: "Введите фамилию",
    errEmailEmpty: "Введите email",
    errEmailInvalid: "Email указан неверно",
    errPasswordEmpty: "Введите пароль",
    errPasswordShort: "Пароль должен содержать не менее 6 символов",
    errPasswordConfirmEmpty: "Повторите пароль",
    errPasswordMismatch: "Пароли не совпадают",
    errLoginPassword: "Введите пароль",
    networkError: "Не удалось связаться с сервером. Попробуйте ещё раз.",
    welcome: "Добро пожаловать, {name}! Регистрация прошла успешно.",
    welcomeBack: "С возвращением, {name}!",
    loggedOut: "Вы вышли из аккаунта.",

    guestsOption: ({ n }) => n + " " + ruPlural(n, "гость", "гостя", "гостей"),
    seatsShort: ({ n }) => n + " " + ruPlural(n, "место", "места", "мест"),
    tableN: "Столик {n}",
    stateFree: "свободен",
    stateBusy: "занят",
    stateSmall: "мал для вашей группы",
    statusFree: ({ n }) => "Для вашей группы " + ruPlural(n, "свободен", "свободно", "свободно") + " " + n + " " +
      ruPlural(n, "столик", "столика", "столиков") + ". Выберите на схеме.",
    statusNone: "В это время нет свободного столика для вашей группы. Попробуйте другое время или день.",
    statusChooseDay: "Выберите день.",
    statusChooseRestaurant: "Выберите ресторан.",
    statusLoading: "Обновляем схему зала…",
    askLogin: "Чтобы забронировать, войдите или зарегистрируйтесь.",
    booked: "{restaurant}: столик {n} забронирован на {date}, {time}.",
    formatDate: ({ day, month }) => day + " " + MONTHS_RU[month],

    zoneWindow: "У окна",
    zoneCenter: "Центр зала",
    zoneSofa: "Уголок с диваном",
    zoneBig: "Большой стол",
    zoneHall: "Зал",
    desc1: "Светлый уголок с видом на улицу. Удобно выпить кофе вдвоём.",
    desc2: "Днём солнечный столик напротив большого окна.",
    desc3: "Спокойный столик у бара для беседы.",
    desc4: "Подходит для небольших дружеских встреч.",
    desc5: "В центре зала, рядом с баром и окнами.",
    desc6: "Рядом с баром — для быстрого обслуживания.",
    desc7: "Уютный уголок с мягким диваном.",
    desc8: "Длинный деревянный стол для семейных или рабочих встреч.",

    errEmailTaken: "Пользователь с таким email уже зарегистрирован",
    errLoginWrong: "Неверный email или пароль",
    errDateTime: "Укажите правильные день и время",
    errLoginRequired: "Войдите в аккаунт",
    errLoginToBook: "Войдите, чтобы забронировать",
    errPastTime: "Нельзя забронировать на прошедшее время",
    errGuests: "Укажите количество гостей",
    errNoTable: "Такого столика нет",
    errMaxSeats: "За этим столиком помещается не более {n} человек",
    errTableBusy: "Этот столик уже занят на это время",
    errServer: "Ошибка сервера, попробуйте ещё раз",
    errNoReservation: "Бронирование не найдено",
    errAlreadyCancelled: "Это бронирование уже отменено",
    errCancelTooLate: "Бронирование можно отменить не позднее чем за 1 час",
    errClosing: "Бронирование должно закончиться до 23:00",

    myBookingsTitle: "Мои бронирования",
    myBookingsEmpty: "У вас пока нет бронирований.",
    newBookingBtn: "+ Новое бронирование",
    msgPending: "Ждём подтверждения ресторана.",
    msgConfirmed: "Ресторан подтвердил ваше бронирование. Ждём вас!",
    msgRejected: "Ресторан отклонил бронирование. Сообщение:",
    msgCancelled: "Вы отменили это бронирование.",
    msgAnswered: "Ресторан ответил на ваше бронирование.",
    cancelRule: "Бронирование можно отменить не позднее чем за 1 час до начала.",
    statusPending: "Ожидает",
    statusConfirmed: "Подтверждено",
    statusCancelled: "Отменено",
    cancelBtn: "Отменить",
    cancelConfirm: "Отменить бронирование столика {n} на {date}, {time}?",
    cancelled: "Бронирование отменено.",
    cancelTooLate: "Отменить уже нельзя",

    restaurantsTitle: "Рестораны",
    restaurantsLead: "Выберите, куда хотите пойти.",
    restaurantsEmpty: "Ресторанов пока нет.",
    addRestaurant: "+ Добавить ресторан",
    bookTableBtn: "Забронировать столик",
    editBtn: "Изменить",
    deleteBtn: "Удалить",
    restaurantFormAdd: "Новый ресторан",
    restaurantFormEdit: "Изменить ресторан",
    labelName: "Название",
    labelCuisine: "Кухня",
    labelAddress: "Адрес",
    labelDescription: "Описание",
    labelImage: "Ссылка на фото (https://…)",
    saveBtn: "Сохранить",
    restaurantSaved: "Ресторан сохранён.",
    restaurantDeleted: "Ресторан удалён.",
    deleteConfirm: "Удалить ресторан «{name}»?",
    errName: "Введите название ресторана",
    labelCity: "Город",
    allCities: "Все города",
    noRestaurantsInCity: "В этом городе пока нет ресторанов.",
    errCity: "Выберите город",
    dishAdd: "Выбрать",
    dishMore: "Добавить ещё «{name}»",
    dishLess: "Убрать одно «{name}»",
    orderTitle: "Ваш заказ",
    orderAdd: "+ Выбрать блюда",
    orderChange: "Изменить",
    orderClear: "Очистить",
    orderTotal: "Итого: {total}",
    orderSummary: "Итого: блюд {n} · {total}",
    orderRemove: "Убрать «{name}» из заказа",
    bookWithOrder: "Забронировать столик с этим заказом",
    errOrder: "Неверный заказ",
    errOrderDish: "Такого блюда нет в меню",
    menuBtn: "Меню",
    menuAll: "Все",
    menuEmpty: "Меню пока не готово.",
    menuEmptyAdmin: "Блюд пока нет. Добавьте первое с помощью формы ниже.",
    dishFormAdd: "Новое блюдо",
    dishFormEdit: "Изменить: {name}",
    menuEditorTitle: "Меню: {name}",
    menuDishCount: "Блюд: {n}",
    menuCat_starters: "Закуски",
    menuCat_salads: "Салаты",
    menuCat_soups: "Супы",
    menuCat_mains: "Основные блюда",
    menuCat_grill: "Шашлык и гриль",
    menuCat_desserts: "Десерты",
    menuCat_drinks: "Напитки",
    labelCategory: "Раздел",
    labelPrice: "Цена, ֏",
    labelDishName: "Блюдо",
    labelDishDescription: "Описание",
    labelDishImage: "Ссылка на фото блюда (https://…)",
    bookingsCount: "Бронирований: {n}",
    newBookings: "Новых: {n}",
    cityUnknown: "Без города",
    addDish: "Добавить блюдо",
    saveDish: "Сохранить изменения",
    cancelEdit: "Отмена",
    dishAdded: "Блюдо добавлено.",
    dishSaved: "Блюдо сохранено.",
    dishDeleted: "Блюдо удалено.",
    deleteDishConfirm: "Удалить блюдо «{name}» из меню?",
    errDishName: "Введите название блюда",
    errPrice: "Укажите правильную цену",
    errCategory: "Выберите раздел",
    errNoDish: "Такого блюда нет",
    restaurantSearchPlaceholder: "Поиск по названию, кухне, адресу или городу",
    restaurantSearchFound: "Найдено: {n}",
    restaurantSearchNone: "Такой ресторан не найден.",
    importLabel: "Заполнить со страницы ресторана",
    importBtn: "Заполнить",
    importHint: "Вставьте ссылку на сайт или страницу ресторана, затем проверьте поля и сохраните.",
    importLoading: "Открываем страницу…",
    importDone: "Поля заполнены со страницы. Проверьте их и нажмите «Сохранить».",
    importDoneNoCity: "Поля заполнены со страницы, но город не распознан. Выберите его и нажмите «Сохранить».",
    errImportUrl: "Вставьте правильную ссылку (https://…)",
    errImportBadUrl: "Неверная ссылка",
    errImportFetch: "Не удалось открыть страницу",
    errImportNoData: "На странице не найдены данные ресторана",
    errImage: "Ссылка на фото должна начинаться с https://",
    errTooLong: "Текст слишком длинный",
    errAdminOnly: "Только администратор может изменять рестораны",
    errNoRestaurant: "Ресторан не найден",

    adminPageTitle: "TableBook — панель администратора",
    adminTag: "Админ",
    adminPanelBtn: "Админ",
    mainPageBtn: "Главная",
    adminLoginTitle: "Вход для администратора",
    adminLoginLead: "Только для сотрудников.",
    accessDenied: "Доступ запрещён",
    notAdminAccount: "Этот аккаунт не является администратором.",
    accessDeniedText: "Этот аккаунт не является администратором. Выйдите и войдите с аккаунтом администратора.",
    adminWelcome: "Добро пожаловать, {name}",
    adminBookingsTitle: "Бронирования",
    adminBookingsEmpty: "Нет предстоящих бронирований.",
    confirmBtn: "Подтвердить",
    adminTablesTitle: "Свободные и занятые столики",
    adminTablesSummary: "Свободно: {free} · Занято: {busy}",
    adminTablesSummaryDay: "В этот день забронировано столиков: {busy} из {total}",
    allDay: "Весь день",
    freeAllDay: "Свободен весь день",
    tablesBtn: "Столики",
    bookingConfirmed: "Бронирование подтверждено.",
    errCannotConfirm: "Отменённое бронирование нельзя подтвердить",
    errAccessDenied: "Доступ запрещён",
    rejectBtn: "Отклонить",
    rejectTitle: "Отклонить бронирование",
    rejectTemplatesLabel: "Готовые ответы",
    rejectReasonLabel: "Сообщение гостю",
    rejectSubmit: "Отклонить и отправить",
    rejectReasonShown: "Причина отказа: {reason}",
    statusRejected: "Отклонено",
    bookingRejected: "Бронирование отклонено, сообщение отправлено гостю.",
    errRejectReason: "Напишите причину отказа",
    rejectTplBusyTitle: "Столик занят",
    rejectTplBusy: "К сожалению, этот столик на это время уже занят. Пожалуйста, выберите другой столик или время.",
    rejectTplClosedTitle: "Закрытое мероприятие",
    rejectTplClosed: "В это время в ресторане проходит закрытое мероприятие. Будем рады видеть вас в другой день.",
    rejectTplGuestsTitle: "Много гостей",
    rejectTplGuests: "Для этого столика слишком много гостей. Пожалуйста, забронируйте столик побольше.",
    rejectTplTimeTitle: "Время недоступно",
    rejectTplTime: "На это время мы не принимаем бронирования. Пожалуйста, выберите другое время.",
  },

  en: {
    pageTitle: "Table Book — table booking",
    langAria: "Language",
    navHow: "Steps",
    navFeatures: "Features",
    themeDark: "Dark",
    themeLight: "Light",
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",

    heroTitle: "TableBook",
    heroText: "A simple tool: guests book a table online, and the café manages all its reservations in one place.",

    bookingTitle: "Restaurant booking",
    guideTitle: "Guide",
    hallTab: "Floor plan",
    chooseRestaurant: "Choose a restaurant from the list.",
    restaurantListAll: "All restaurants",
    restaurantListLess: "Fewer restaurants",
    bookingLead: "Choose a restaurant, the day, time and number of guests, then pick a free table on the floor plan. Each booking is for 1 hour.",
    labelRestaurant: "Restaurant",
    labelDate: "Date",
    labelTime: "Time",
    labelGuests: "Guests",
    findTable: "Find a free table",
    legendFree: "Free",
    legendSelected: "Selected",
    legendBusy: "Taken",
    legendSmall: "Too small for your group",
    hallWindows: "Windows",
    hallBar: "Bar",
    hallDoor: "Entrance",
    panelChoose: "Choose a table",
    panelChooseText: "Click a free table on the plan to see its details.",
    factSeats: "Seats",
    factDate: "Date",
    factTime: "Time",
    factGuests: "Guests",
    bookNow: "Book",


    howTitle: "Steps",
    howLead: "Booking takes just a few steps.",
    how1Title: "Pick a time",
    how1Text: "Chooses the date, time and number of guests on the site.",
    how2Title: "Choose a table",
    how2Text: "The system shows only the tables that are free at the chosen time.",
    how3Title: "Add details",
    how3Text: "Enters a name and phone number, then confirms the booking.",
    how4Title: "Café confirms",
    how4Text: "The booking appears right away on the café's admin page, where it can be confirmed or cancelled.",

    featTitle: "Features",
    feat1Title: "Online booking",
    feat1Text: "Guests can book a table at any time of day.",
    feat2Title: "Tables",
    feat2Text: "Add tables and set their number of seats and location.",
    feat3Title: "No double booking",
    feat3Text: "The system won't let the same table be booked twice for the same time.",
    feat4Title: "Booking list",
    feat4Text: "All of the day's bookings on one page, sorted by time.",
    feat5Title: "Confirm & cancel",
    feat5Text: "The café can confirm, change or cancel any booking.",
    feat6Title: "Any device",
    feat6Text: "Works on computers, tablets and phones, in light and dark mode.",

    closeAria: "Close",
    signupTitle: "Sign up",
    labelFirstName: "First name",
    labelLastName: "Last name",
    labelEmail: "Email",
    labelPassword: "Password",
    labelPasswordConfirm: "Repeat password",
    signupSubmit: "Sign up",
    haveAccount: "Already have an account?",
    loginLink: "Log in",
    loginTitle: "Log in",
    loginSubmit: "Log in",
    noAccount: "Don't have an account yet?",
    signupLink: "Sign up",

    footerText: "TableBook · Table booking system",

    errFirstName: "Enter your first name",
    errLastName: "Enter your last name",
    errEmailEmpty: "Enter your email",
    errEmailInvalid: "The email is not valid",
    errPasswordEmpty: "Enter a password",
    errPasswordShort: "The password must be at least 6 characters",
    errPasswordConfirmEmpty: "Repeat the password",
    errPasswordMismatch: "The passwords don't match",
    errLoginPassword: "Enter your password",
    networkError: "Couldn't reach the server. Please try again.",
    welcome: "Welcome, {name}! You're signed up.",
    welcomeBack: "Welcome back, {name}!",
    loggedOut: "You've logged out.",

    guestsOption: ({ n }) => n + (n === 1 ? " guest" : " guests"),
    seatsShort: ({ n }) => n + (n === 1 ? " seat" : " seats"),
    tableN: "Table {n}",
    stateFree: "free",
    stateBusy: "taken",
    stateSmall: "too small for your group",
    statusFree: ({ n }) => n + (n === 1 ? " table is" : " tables are") + " free for your group. Pick one on the plan.",
    statusNone: "No table is free for your group at this time. Try another time or day.",
    statusChooseDay: "Choose a day.",
    statusChooseRestaurant: "Choose a restaurant.",
    statusLoading: "Updating the floor plan…",
    askLogin: "Log in or sign up to book.",
    booked: "{restaurant}: table {n} is booked for {date}, {time}.",
    formatDate: ({ day, month }) => MONTHS_EN[month] + " " + day,

    zoneWindow: "By the window",
    zoneCenter: "Center of the hall",
    zoneSofa: "Sofa corner",
    zoneBig: "Large table",
    zoneHall: "Hall",
    desc1: "A bright corner with a street view. Perfect for coffee for two.",
    desc2: "A sunny table facing the big window during the day.",
    desc3: "A quiet table near the bar, good for conversation.",
    desc4: "Good for small get-togethers with friends.",
    desc5: "In the middle of the hall, close to the bar and the windows.",
    desc6: "Next to the bar for quick service.",
    desc7: "A cozy corner with a soft sofa.",
    desc8: "A long wooden table for family or work gatherings.",

    errEmailTaken: "An account with this email already exists",
    errLoginWrong: "Wrong email or password",
    errDateTime: "Choose a valid date and time",
    errLoginRequired: "Please log in",
    errLoginToBook: "Log in to book",
    errPastTime: "You can't book a time that has already passed",
    errGuests: "Choose the number of guests",
    errNoTable: "That table doesn't exist",
    errMaxSeats: "This table seats at most {n} people",
    errTableBusy: "This table is already taken at that time",
    errServer: "Server error, please try again",
    errNoReservation: "Booking not found",
    errAlreadyCancelled: "This booking is already cancelled",
    errCancelTooLate: "A booking can be cancelled no later than 1 hour before it starts",
    errClosing: "The booking must end by 23:00",

    myBookingsTitle: "My bookings",
    myBookingsEmpty: "You have no bookings yet.",
    newBookingBtn: "+ New booking",
    msgPending: "Waiting for the restaurant to confirm.",
    msgConfirmed: "The restaurant confirmed your booking. See you soon!",
    msgRejected: "The restaurant rejected the booking. Message:",
    msgCancelled: "You cancelled this booking.",
    msgAnswered: "The restaurant answered your booking.",
    cancelRule: "You can cancel a booking up to 1 hour before it starts.",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusCancelled: "Cancelled",
    cancelBtn: "Cancel",
    cancelConfirm: "Cancel the booking for table {n} on {date}, {time}?",
    cancelled: "Booking cancelled.",
    cancelTooLate: "Can no longer be cancelled",

    restaurantsTitle: "Restaurants",
    restaurantsLead: "Choose where you'd like to go.",
    restaurantsEmpty: "No restaurants yet.",
    addRestaurant: "+ Add restaurant",
    bookTableBtn: "Book a table",
    editBtn: "Edit",
    deleteBtn: "Delete",
    restaurantFormAdd: "New restaurant",
    restaurantFormEdit: "Edit restaurant",
    labelName: "Name",
    labelCuisine: "Cuisine",
    labelAddress: "Address",
    labelDescription: "Description",
    labelImage: "Photo link (https://…)",
    saveBtn: "Save",
    restaurantSaved: "Restaurant saved.",
    restaurantDeleted: "Restaurant deleted.",
    deleteConfirm: "Delete the restaurant “{name}”?",
    errName: "Enter the restaurant name",
    labelCity: "City",
    allCities: "All cities",
    noRestaurantsInCity: "No restaurants in this city yet.",
    errCity: "Choose a city",
    dishAdd: "Add",
    dishMore: "Add one more {name}",
    dishLess: "Remove one {name}",
    orderTitle: "Your order",
    orderAdd: "+ Choose dishes",
    orderChange: "Change",
    orderClear: "Clear",
    orderTotal: "Total: {total}",
    orderSummary: "Total: {n} dishes · {total}",
    orderRemove: "Remove {name} from the order",
    bookWithOrder: "Book a table with this order",
    errOrder: "The order is not valid",
    errOrderDish: "This dish is not on the menu",
    menuBtn: "Menu",
    menuAll: "All",
    menuEmpty: "The menu isn't ready yet.",
    menuEmptyAdmin: "No dishes yet. Add the first one with the form below.",
    dishFormAdd: "New dish",
    dishFormEdit: "Edit: {name}",
    menuEditorTitle: "Menu: {name}",
    menuDishCount: "{n} dishes",
    menuCat_starters: "Starters",
    menuCat_salads: "Salads",
    menuCat_soups: "Soups",
    menuCat_mains: "Main courses",
    menuCat_grill: "Grill & khorovats",
    menuCat_desserts: "Desserts",
    menuCat_drinks: "Drinks",
    labelCategory: "Section",
    labelPrice: "Price, ֏",
    labelDishName: "Dish",
    labelDishDescription: "Description",
    labelDishImage: "Dish photo link (https://…)",
    bookingsCount: "{n} bookings",
    newBookings: "{n} new",
    cityUnknown: "No city",
    addDish: "Add dish",
    saveDish: "Save changes",
    cancelEdit: "Cancel",
    dishAdded: "Dish added.",
    dishSaved: "Dish saved.",
    dishDeleted: "Dish deleted.",
    deleteDishConfirm: "Delete \"{name}\" from the menu?",
    errDishName: "Enter the dish name",
    errPrice: "Enter a valid price",
    errCategory: "Choose a section",
    errNoDish: "No such dish",
    restaurantSearchPlaceholder: "Search by name, cuisine, address or city",
    restaurantSearchFound: "Found: {n}",
    restaurantSearchNone: "No restaurant matches your search.",
    importLabel: "Fill in from the restaurant's page",
    importBtn: "Fill in",
    importHint: "Paste a link to the restaurant's website or page, then check the fields and save.",
    importLoading: "Opening the page…",
    importDone: "The fields were filled in from the page. Check them and click Save.",
    importDoneNoCity: "The fields were filled in, but the city wasn't recognised. Choose it and click Save.",
    errImportUrl: "Paste a valid link (https://…)",
    errImportBadUrl: "The link is not valid",
    errImportFetch: "Couldn't open the page",
    errImportNoData: "No restaurant data found on the page",
    errImage: "The photo link must start with https://",
    errTooLong: "The text is too long",
    errAdminOnly: "Only the admin can change restaurants",
    errNoRestaurant: "Restaurant not found",

    adminPageTitle: "TableBook — admin panel",
    adminTag: "Admin",
    adminPanelBtn: "Admin",
    mainPageBtn: "Main page",
    adminLoginTitle: "Admin login",
    adminLoginLead: "For staff only.",
    accessDenied: "Access denied",
    notAdminAccount: "This account is not an admin.",
    accessDeniedText: "This account is not an admin. Log out and log in with an admin account.",
    adminWelcome: "Welcome, {name}",
    adminBookingsTitle: "Bookings",
    adminBookingsEmpty: "No upcoming bookings.",
    confirmBtn: "Confirm",
    adminTablesTitle: "Free and busy tables",
    adminTablesSummary: "Free: {free} · Busy: {busy}",
    adminTablesSummaryDay: "Tables booked this day: {busy} of {total}",
    allDay: "All day",
    freeAllDay: "Free all day",
    tablesBtn: "Tables",
    bookingConfirmed: "Booking confirmed.",
    errCannotConfirm: "A cancelled booking can't be confirmed",
    errAccessDenied: "Access denied",
    rejectBtn: "Reject",
    rejectTitle: "Reject booking",
    rejectTemplatesLabel: "Ready replies",
    rejectReasonLabel: "Message to the guest",
    rejectSubmit: "Reject and send",
    rejectReasonShown: "Reason: {reason}",
    statusRejected: "Rejected",
    bookingRejected: "Booking rejected, the message was sent to the guest.",
    errRejectReason: "Write the reason for rejecting",
    rejectTplBusyTitle: "Table taken",
    rejectTplBusy: "Unfortunately, this table is already taken at that time. Please choose another table or time.",
    rejectTplClosedTitle: "Private event",
    rejectTplClosed: "The restaurant is hosting a private event at that time. We'd be happy to see you another day.",
    rejectTplGuestsTitle: "Too many guests",
    rejectTplGuests: "There are too many guests for this table. Please book a larger table.",
    rejectTplTimeTitle: "Time unavailable",
    rejectTplTime: "We don't accept bookings for that time. Please choose another time.",
  },
};

// Հայաստանի քաղաքները. բանալին պահվում է բազայում, անունը ցույց է տրվում ընտրված լեզվով
const CITIES = [
  ["yerevan", "Երևան", "Ереван", "Yerevan"],
  ["gyumri", "Գյումրի", "Гюмри", "Gyumri"],
  ["vanadzor", "Վանաձոր", "Ванадзор", "Vanadzor"],
  ["vagharshapat", "Վաղարշապատ (Էջմիածին)", "Вагаршапат (Эчмиадзин)", "Vagharshapat (Etchmiadzin)"],
  ["abovyan", "Աբովյան", "Абовян", "Abovyan"],
  ["hrazdan", "Հրազդան", "Раздан", "Hrazdan"],
  ["kapan", "Կապան", "Капан", "Kapan"],
  ["armavir", "Արմավիր", "Армавир", "Armavir"],
  ["artashat", "Արտաշատ", "Арташат", "Artashat"],
  ["ashtarak", "Աշտարակ", "Аштарак", "Ashtarak"],
  ["gavar", "Գավառ", "Гавар", "Gavar"],
  ["goris", "Գորիս", "Горис", "Goris"],
  ["dilijan", "Դիլիջան", "Дилижан", "Dilijan"],
  ["ijevan", "Իջևան", "Иджеван", "Ijevan"],
  ["sevan", "Սևան", "Севан", "Sevan"],
  ["jermuk", "Ջերմուկ", "Джермук", "Jermuk"],
  ["tsaghkadzor", "Ծաղկաձոր", "Цахкадзор", "Tsaghkadzor"],
  ["sisian", "Սիսիան", "Сисиан", "Sisian"],
  ["stepanavan", "Ստեփանավան", "Степанаван", "Stepanavan"],
  ["yeghegnadzor", "Եղեգնաձոր", "Ехегнадзор", "Yeghegnadzor"],
  ["alaverdi", "Ալավերդի", "Алаверди", "Alaverdi"],
  ["masis", "Մասիս", "Масис", "Masis"],
  ["charentsavan", "Չարենցավան", "Чаренцаван", "Charentsavan"],
  ["meghri", "Մեղրի", "Мегри", "Meghri"],
].map(([key, hy, ru, en]) => ({ key, names: { hy, ru, en } }));

function cityName(key) {
  const city = CITIES.find((c) => c.key === key);
  return city ? city.names[currentLang] || city.names.en : key;
}

// Ռեստորանի քարտի տեղակայման տողը՝ «📍 Քաղաք · հասցե»
function restaurantLocation(restaurant) {
  const line = document.createElement("p");
  line.className = "restaurant-address";
  const city = document.createElement("strong");
  city.textContent = cityName(restaurant.city);
  line.append("📍 ", city);
  if (restaurant.address) line.append(" · " + restaurant.address);
  return line;
}

// ---------- Ճաշացանկ (ընդհանուր գլխավոր և ադմին էջերի համար) ----------

// Գինը դրամով՝ «3 500 ֏»
function formatPrice(price) {
  return String(price).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ֏";
}

// Ուտեստի փոքր նկարը. եթե նկար չկա (կամ չի բացվում)՝ բաժնի պատկերակը
const MENU_ICONS = { starters: "🥖", salads: "🥗", soups: "🍲", mains: "🍽️", grill: "🍖", desserts: "🍰", drinks: "🥤" };

function dishThumb(dish) {
  const thumb = document.createElement("div");
  thumb.className = "menu-thumb";
  const showIcon = () => {
    thumb.innerHTML = "";
    thumb.textContent = MENU_ICONS[dish.category] || "🍽️";
  };
  if (dish.imageUrl && dish.imageUrl.startsWith("https://")) {
    const img = document.createElement("img");
    img.src = dish.imageUrl;
    img.alt = dish.name;
    img.loading = "lazy";
    img.addEventListener("error", showIcon);
    thumb.appendChild(img);
  } else {
    showIcon();
  }
  return thumb;
}

// Ամրագրման հետ պատվիրված ուտեստները մեկ տողով՝ «🍽 Dolma × 2, Gata × 1 · 8 200 ֏»
function orderLine(order, tag = "span") {
  if (!order || !order.length) return null;
  const line = document.createElement(tag);
  line.className = "booking-order";
  const total = order.reduce((sum, dish) => sum + dish.price * dish.qty, 0);
  line.textContent = "🍽 " + order.map((dish) => dish.name + " × " + dish.qty).join(", ") + " · " + formatPrice(total);
  return line;
}

// Ուտեստները՝ բաժիններով (categories-ի հերթականությամբ). category-ով՝ միայն այդ բաժինը։
// decorate-ը թույլ է տալիս ադմինին ավելացնել «Փոխել» և «Ջնջել» կոճակները
function renderMenuList(container, items, categories, { category = "", decorate = null } = {}) {
  container.innerHTML = "";
  categories.filter((key) => !category || key === category).forEach((key) => {
    const dishes = items.filter((item) => item.category === key);
    if (!dishes.length) return;

    const group = document.createElement("section");
    group.className = "menu-group";
    const title = document.createElement("h3");
    title.textContent = t("menuCat_" + key);
    const list = document.createElement("ul");
    dishes.forEach((dish) => {
      const row = document.createElement("li");
      row.className = "menu-item";
      const thumb = dishThumb(dish);
      const text = document.createElement("div");
      text.className = "menu-item-text";
      const name = document.createElement("strong");
      name.textContent = dish.name;
      text.appendChild(name);
      if (dish.description) {
        const description = document.createElement("span");
        description.textContent = dish.description;
        text.appendChild(description);
      }
      const price = document.createElement("span");
      price.className = "menu-price";
      price.textContent = formatPrice(dish.price);
      row.append(thumb, text, price);
      if (decorate) decorate(row, dish);
      list.appendChild(row);
    });
    group.append(title, list);
    container.appendChild(group);
  });
}

// Լցնում է քաղաքների ցանկը. allLabel-ով առաջինը «Բոլոր քաղաքները» տարբերակն է (դատարկ արժեքով)։
// counts-ով քաղաքի կողքին գրվում է, քանի ռեստորան կա այնտեղ
function fillCitySelect(select, { allLabel = false, counts = null } = {}) {
  const previous = select.value;
  select.innerHTML = "";
  if (allLabel) select.add(new Option(t("allCities"), ""));
  CITIES.forEach((city) => {
    const n = counts ? counts[city.key] || 0 : null;
    select.add(new Option(cityName(city.key) + (n ? " (" + n + ")" : ""), city.key));
  });
  if ([...select.options].some((o) => o.value === previous)) select.value = previous;
}

const LANGUAGES = ["en", "hy", "ru"];
let currentLang = "en";

// Վերադարձնում է տեքստը ընտրված լեզվով. {name}-ի պես տեղերը փոխարինվում են vars-ից
function t(key, vars = {}) {
  const value = TRANSLATIONS[currentLang][key] ?? TRANSLATIONS.en[key] ?? key;
  if (typeof value === "function") return value(vars);
  return value.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
}

// Սերվերը սխալները ուղարկում է հայերեն. այստեղ դրանք թարգմանվում են ընտրված լեզվով
const SERVER_MESSAGES = {
  "Գրեք ձեր անունը": "errFirstName",
  "Գրեք ձեր ազգանունը": "errLastName",
  "Email-ը սխալ է գրված": "errEmailInvalid",
  "Գաղտնաբառը պետք է լինի առնվազն 6 նիշ": "errPasswordShort",
  "Այս email-ով արդեն գրանցված օգտատեր կա": "errEmailTaken",
  "Email-ը կամ գաղտնաբառը սխալ է": "errLoginWrong",
  "Նշեք ճիշտ օր և ժամ": "errDateTime",
  "Մուտք գործեք": "errLoginRequired",
  "Ամրագրելու համար մուտք գործեք": "errLoginToBook",
  "Անցած ժամի համար ամրագրել հնարավոր չէ": "errPastTime",
  "Նշեք հյուրերի քանակը": "errGuests",
  "Այդպիսի սեղան չկա": "errNoTable",
  "Այս սեղանն այդ ժամին արդեն զբաղված է": "errTableBusy",
  "Սերվերի սխալ, փորձեք կրկին": "errServer",
  "Այդպիսի ամրագրում չկա": "errNoReservation",
  "Ամրագրումն արդեն չեղարկված է": "errAlreadyCancelled",
  "Ամրագրումը կարելի է չեղարկել առնվազն 1 ժամ առաջ": "errCancelTooLate",
  "Ամրագրումը պետք է ավարտվի մինչև 23:00": "errClosing",
  "Գրեք ռեստորանի անվանումը": "errName",
  "Ընտրեք քաղաքը": "errCity",
  "Պատվերը սխալ է": "errOrder",
  "Ճաշացանկում այդպիսի ուտեստ չկա": "errOrderDish",
  "Ընտրեք բաժինը": "errCategory",
  "Գրեք ուտեստի անվանումը": "errDishName",
  "Նշեք ճիշտ գին": "errPrice",
  "Այդպիսի ուտեստ չկա": "errNoDish",
  "Տեղադրեք ճիշտ հղում (https://…)": "errImportUrl",
  "Հղումը սխալ է": "errImportBadUrl",
  "Էջը բացել չհաջողվեց": "errImportFetch",
  "Էջում ռեստորանի տվյալներ չգտնվեցին": "errImportNoData",
  "Լուսանկարի հղումը պետք է սկսվի https://-ով": "errImage",
  "Տեքստը չափազանց երկար է": "errTooLong",
  "Միայն ադմինը կարող է փոխել ռեստորանները": "errAdminOnly",
  "Այդպիսի ռեստորան չկա": "errNoRestaurant",
  "Մուտքն արգելված է": "errAccessDenied",
  "Չեղարկված ամրագրումը հնարավոր չէ հաստատել": "errCannotConfirm",
  "Գրեք մերժման պատճառը": "errRejectReason",
};

function translateServer(message) {
  if (!message) return t("networkError");
  if (SERVER_MESSAGES[message]) return t(SERVER_MESSAGES[message]);
  const maxSeats = /առավելագույնը (\d+) հոգի/.exec(message);
  if (maxSeats) return t("errMaxSeats", { n: maxSeats[1] });
  return message;
}

// Էջի անփոփոխ տեքստերը նշված են data-i18n հատկություններով
function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.title = t("pageTitle");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    el.alt = t(el.dataset.i18nAlt);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    el.setAttribute("aria-label", t(el.dataset.i18nAria));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
}

// Պահված լեզուն, իսկ եթե չկա՝ անգլերեն (հիմնական լեզուն)
function detectLanguage() {
  let savedLang = null;
  try { savedLang = localStorage.getItem("lang"); } catch (e) {}
  return LANGUAGES.includes(savedLang) ? savedLang : "en";
}

currentLang = detectLanguage();
