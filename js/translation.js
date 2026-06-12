/**
 * DentCare Pro — Translation Engine (translation.js)
 * ════════════════════════════════════════════════════
 * Centralises ALL Arabic translations including JS-generated content.
 * Works alongside translation.json (loaded via SEED_DATA.translation).
 *
 * Usage:
 *   T('Save')               → 'حفظ' (in AR mode) or 'Save' (in EN mode)
 *   T('Hello {name}', {name: 'Ali'}) → 'مرحباً Ali'
 *   T.lang                  → 'en' or 'ar'
 *   T.setLang('ar')         → switch language + applies RTL
 *   T.apply(element)        → translate all [data-t] children
 */

const T = (function() {

  // ── Arabic translations for ALL JS-generated strings ──────────────────────
  const AR = {
    // ── Common ──────────────────────────────────────────────────────────────
    'Save': 'حفظ',
    'Cancel': 'إلغاء',
    'Delete': 'حذف',
    'Edit': 'تعديل',
    'View': 'عرض',
    'Close': 'إغلاق',
    'Print': 'طباعة',
    'Export': 'تصدير',
    'Import': 'استيراد',
    'Search': 'بحث',
    'Refresh': 'تحديث',
    'Loading…': 'جارٍ التحميل…',
    'No data available': 'لا توجد بيانات',
    'Confirm': 'تأكيد',
    'Logout': 'تسجيل الخروج',
    'Admin Only': 'للمسؤول فقط',
    'Actions': 'الإجراءات',
    'Status': 'الحالة',
    'Date': 'التاريخ',
    'Name': 'الاسم',
    'Phone': 'الهاتف',
    'Email': 'البريد الإلكتروني',
    'Address': 'العنوان',
    'Notes': 'ملاحظات',
    'Amount': 'المبلغ',
    'Total': 'الإجمالي',
    'Description': 'الوصف',
    'Category': 'الفئة',
    'Type': 'النوع',
    'All': 'الكل',
    'Yes': 'نعم',
    'No': 'لا',
    'Active': 'نشط',
    'Inactive': 'غير نشط',
    'Error': 'خطأ',
    'Success': 'نجاح',
    'Warning': 'تحذير',
    'Info': 'معلومات',

    // ── Navigation ──────────────────────────────────────────────────────────
    'Dashboard': 'لوحة التحكم',
    'Waiting Room': 'غرفة الانتظار',
    'Patients': 'المرضى',
    'Appointments': 'المواعيد',
    'Calendar': 'التقويم',
    'Treatments': 'العلاجات',
    'Doctors': 'الأطباء',
    'Finance': 'المالية',
    'Inventory': 'المخزون',
    'Analytics': 'التحليلات',
    'Settings': 'الإعدادات',
    'Backup': 'النسخ الاحتياطي',
    'Messages': 'الرسائل',
    'Passwords': 'كلمات المرور',
    'Commissions': 'العمولات',
    'Payment Plans': 'خطط الدفع',
    'Discount Codes': 'أكواد الخصم',
    'Abilities': 'الصلاحيات',
    'Employment': 'التوظيف',
    'Services': 'الخدمات',
    'Receipts': 'الإيصالات',
    'Prescriptions': 'الوصفات الطبية',
    'Patient Feedback': 'تقييم المرضى',
    'Working Hours': 'ساعات العمل',
    'Supplier Management': 'إدارة الموردين',
    'Lab Order Management': 'إدارة طلبات المختبر',
    'Bulk Expense Payments': 'المدفوعات الجماعية',
    'Insurance Management': 'إدارة التأمين',
    'Diagnostic Imaging': 'التصوير التشخيصي',
    'WhatsApp Bot': 'بوت واتساب',
    'Page Access': 'صلاحيات الصفحات',

    // ── Table headers ───────────────────────────────────────────────────────
    'Patient': 'المريض',
    'Doctor': 'الطبيب',
    'Time': 'الوقت',
    'Tooth': 'السن',
    'Diagnosis': 'التشخيص',
    'Cost': 'التكلفة',
    'Paid': 'مدفوع',
    'Remaining': 'متبقي',
    'Progress': 'التقدم',
    'Age': 'العمر',
    'Gender': 'الجنس',
    'Insurance': 'التأمين',
    'Registered': 'مسجل',
    'Item': 'الصنف',
    'Qty': 'الكمية',
    'Unit Price': 'سعر الوحدة',
    'Supplier': 'المورد',
    'Min Stock': 'الحد الأدنى',
    'Role': 'الدور',
    'Password': 'كلمة المرور',
    'User': 'المستخدم',
    'Code': 'الكود',
    'Value': 'القيمة',
    'Created': 'تاريخ الإنشاء',
    'Revenue': 'الإيرادات',
    'Commission': 'العمولة',
    '#': 'رقم',
    'Arrived': 'وصل',
    'Waiting': 'ينتظر',
    'From': 'من',
    'Request': 'الطلب',
    'Discount': 'الخصم',
    'Treatment': 'العلاج',
    'Priority': 'الأولوية',
    'Specialty': 'التخصص',
    'Start Date': 'تاريخ البدء',
    'End Date': 'تاريخ الانتهاء',
    'Duration': 'المدة',
    'Installments': 'الأقساط',
    'Total Amount': 'المبلغ الإجمالي',
    'Due Date': 'تاريخ الاستحقاق',
    'Modality': 'الطريقة',
    'Findings': 'النتائج',
    'Lab': 'المختبر',
    'Order Date': 'تاريخ الطلب',
    'Sent Date': 'تاريخ الإرسال',
    'Received Date': 'تاريخ الاستلام',
    'Shift': 'الوردية',
    'Clock In': 'تسجيل الدخول',
    'Clock Out': 'تسجيل الخروج',
    'Hours': 'الساعات',
    'Overtime': 'وقت إضافي',
    'Policy': 'الوثيقة',
    'Claim': 'المطالبة',
    'Company': 'الشركة',
    'Coverage': 'التغطية',
    'Deductible': 'المبلغ المقتطع',
    'Rating': 'التقييم',
    'Comment': 'التعليق',
    'Visit Date': 'تاريخ الزيارة',
    'Verified': 'موثق',

    // ── Status values ───────────────────────────────────────────────────────
    'Scheduled': 'مجدول',
    'Confirmed': 'مؤكد',
    'Completed': 'مكتمل',
    'Cancelled': 'ملغي',
    'No Show': 'غياب',
    'Income': 'دخل',
    'Expense': 'مصروف',
    'Normal': 'عادي',
    'Urgent': 'عاجل',
    'Emergency': 'طارئ',
    'Present': 'حاضر',
    'Absent': 'غائب',
    'Pending': 'قيد الانتظار',
    'Approved': 'موافق عليه',
    'Rejected': 'مرفوض',
    'Paid': 'مدفوع',
    'Unpaid': 'غير مدفوع',
    'Sent': 'مرسل',
    'Received': 'مستلم',
    'In Progress': 'جارٍ',
    'On Leave': 'في إجازة',
    'Morning': 'صباحي',
    'Evening': 'مسائي',
    'Night': 'ليلي',
    'Full Day': 'يوم كامل',

    // ── Dashboard ───────────────────────────────────────────────────────────
    'Total Patients': 'إجمالي المرضى',
    "Today's Appts": 'مواعيد اليوم',
    'Doctors on Duty': 'الأطباء المناوبون',
    'Total Revenue': 'إجمالي الإيرادات',
    'Active today': 'نشط اليوم',
    '↑ Growing': '↑ في نمو',
    '0 completed': '0 مكتمل',
    "Today's Schedule": 'جدول اليوم',
    'Quick Actions': 'إجراءات سريعة',
    'Revenue Trend (12 months)': 'اتجاه الإيرادات (12 شهراً)',
    'No appointments today — Schedule one': 'لا توجد مواعيد اليوم — قم بجدولة واحد',
    '⚡ Quick Reception Hub': '⚡ مركز الاستقبال السريع',
    'Register New Patient': 'تسجيل مريض جديد',
    'Schedule Appointment': 'جدولة موعد',
    'Search Records': 'البحث في السجلات',
    'New Patient': 'مريض جديد',
    'New Appointment': 'موعد جديد',
    'Add Transaction': 'إضافة معاملة',
    'ALL →': 'الكل ←',

    // ── Patients page ────────────────────────────────────────────────────────
    'Search patients…': 'البحث عن مرضى…',
    'Register Patient': 'تسجيل مريض',
    '+ Register Patient': '+ تسجيل مريض',
    'No patients found': 'لم يتم العثور على مرضى',
    'Allergies': 'الحساسية',
    'Blood Type': 'فصيلة الدم',
    'Dental Concerns': 'المشكلات السنية',
    'Last Visit': 'آخر زيارة',
    'Next Appointment': 'الموعد القادم',
    'Medical History': 'التاريخ المرضي',
    'Total Treatments': 'إجمالي العلاجات',
    'Total Spent': 'إجمالي المنفق',
    'Balance Due': 'الرصيد المستحق',
    'Patient No.': 'رقم المريض',
    'Male': 'ذكر',
    'Female': 'أنثى',
    'Unknown': 'غير معروف',

    // ── Appointments page ───────────────────────────────────────────────────
    'Schedule Appointment': 'جدولة موعد',
    '+ Schedule': '+ جدولة',
    'No appointments found': 'لم يتم العثور على مواعيد',
    'Mark No-Show': 'تسجيل غياب',
    'Confirm Appointment': 'تأكيد الموعد',
    'Complete': 'اكتمل',
    'Reschedule': 'إعادة الجدولة',
    'Duration (min)': 'المدة (دقيقة)',
    'Appointment Reminders': 'تذكيرات المواعيد',
    'No active appointments for today': 'لا توجد مواعيد نشطة لليوم',
    'Reminder sent': 'تم إرسال التذكير',

    // ── Treatments page ─────────────────────────────────────────────────────
    'Search treatments…': 'البحث عن علاجات…',
    'No treatments found': 'لم يتم العثور على علاجات',
    'Treatment Type': 'نوع العلاج',
    'Teeth Involved': 'الأسنان المعالجة',
    'Follow-up Date': 'تاريخ المتابعة',
    'Composite Filling': 'حشوة مركبة',
    'Amalgam Filling': 'حشوة أملغم',
    'Crown Placement': 'تركيب تاج',
    'Root Canal': 'علاج جذر',
    'Extraction': 'خلع سن',
    'Scaling & Polishing': 'تنظيف وتلميع',
    'Teeth Whitening': 'تبييض أسنان',
    'Implant Placement': 'زرع سن',
    'Orthodontics': 'تقويم أسنان',
    'Veneers': 'قشرة خزفية',
    'Dentures': 'طقم أسنان',
    'Dental X-Ray': 'أشعة سنية',
    'Panoramic X-Ray': 'أشعة بانورامية',
    'Fluoride Treatment': 'علاج بالفلورايد',
    'Sealants': 'مواد الختم',
    'Consultation': 'استشارة',

    // ── Doctors page ────────────────────────────────────────────────────────
    'Medical Staff': 'الكوادر الطبية',
    '+ Add Doctor': '+ إضافة طبيب',
    'No doctors found': 'لم يتم العثور على أطباء',
    'Patients Seen': 'المرضى المُعالَجون',
    'Revenue Generated': 'الإيرادات المحققة',
    'Commission %': 'نسبة العمولة %',
    'Commission Earned': 'العمولة المكتسبة',
    'On Duty': 'في الخدمة',
    'Off Duty': 'خارج الخدمة',
    'General Dentistry': 'طب أسنان عام',
    'Orthodontics': 'تقويم الأسنان',
    'Endodontics': 'علاج الجذور',
    'Periodontics': 'أمراض اللثة',
    'Oral Surgery': 'جراحة الفم',
    'Prosthodontics': 'الاستعاضة الصناعية',
    'Pediatric Dentistry': 'طب أسنان الأطفال',

    // ── Finance page ─────────────────────────────────────────────────────────
    'Add Transaction': 'إضافة معاملة',
    'No transactions found': 'لم يتم العثور على معاملات',
    'Net Profit': 'صافي الربح',
    'Total Income': 'إجمالي الدخل',
    'Total Expenses': 'إجمالي المصروفات',
    'Total Paid': 'إجمالي المدفوع',
    'Cash': 'نقداً',
    'Card': 'بطاقة',
    'Bank Transfer': 'تحويل بنكي',
    'Insurance': 'تأمين',
    'Cheque': 'شيك',
    'Payment Method': 'طريقة الدفع',
    'Revenue Trend': 'اتجاه الإيرادات',
    'Expenses by Category': 'المصروفات حسب الفئة',
    'Monthly Summary': 'ملخص شهري',

    // ── Inventory page ──────────────────────────────────────────────────────
    'Search inventory…': 'البحث في المخزون…',
    '+ Add Item': '+ إضافة صنف',
    'No items found': 'لم يتم العثور على أصناف',
    'Low Stock': 'مخزون منخفض',
    'Out of Stock': 'نفد المخزون',
    'Consumable': 'مستهلك',
    'Equipment': 'معدات',
    'Medicine': 'دواء',
    'Other': 'أخرى',
    'Restock Alert': 'تنبيه إعادة التخزين',
    'Total Items': 'إجمالي الأصناف',
    'Low Stock Items': 'أصناف منخفضة المخزون',

    // ── Waiting Room page ───────────────────────────────────────────────────
    '🪑 Waiting Room': '🪑 غرفة الانتظار',
    '↺ Refresh': '↺ تحديث',
    '🗑 Clear All': '🗑 مسح الكل',
    '⏳ Add to Queue': '⏳ إضافة للدور',
    'Queue Status': 'حالة الدور',
    'patients waiting': 'مرضى في الانتظار',
    'Waiting room is empty': 'غرفة الانتظار فارغة',
    'Add to Queue': 'إضافة للدور',
    'Remove from Queue': 'إزالة من الدور',
    'Orb pulses faster & turns red as queue grows': 'يتسارع النبض ويتحول للأحمر مع ازدياد الدور',

    // ── Analytics page ──────────────────────────────────────────────────────
    'Revenue vs Expenses': 'الإيرادات مقابل المصروفات',
    'Treatment Distribution': 'توزيع العلاجات',
    'Doctor Performance': 'أداء الأطباء',
    'Patient Demographics': 'إحصاءات المرضى',
    'By Age Group': 'حسب الفئة العمرية',
    'By Gender': 'حسب الجنس',
    'Clinic Average': 'متوسط العيادة',
    'Avg Overall': 'المتوسط العام',
    'Avg Turnaround': 'متوسط وقت التحويل',
    'Avg Wait Time': 'متوسط وقت الانتظار',
    'Patient Satisfaction': 'رضا المرضى',
    'Cleanliness': 'النظافة',
    'Dr. Time': 'وقت الطبيب',
    'Overall': 'الإجمالي',
    'Expenses': 'المصروفات',
    'No data for this period': 'لا توجد بيانات لهذه الفترة',
    'Failed to load analytics': 'فشل تحميل التحليلات',

    // ── Settings page ────────────────────────────────────────────────────────
    'Clinic Information': 'معلومات العيادة',
    'Clinic Name': 'اسم العيادة',
    'Clinic Logo': 'شعار العيادة',
    'Currency': 'العملة',
    'Timezone': 'المنطقة الزمنية',
    'Language': 'اللغة',
    'Theme': 'المظهر',
    'Dark Mode': 'الوضع المظلم',
    'Light Mode': 'الوضع المضيء',
    'Notifications': 'الإشعارات',
    'Auto Backup': 'نسخ احتياطي تلقائي',
    'Reset System': 'إعادة تعيين النظام',
    'Save Settings': 'حفظ الإعدادات',
    'Settings saved ✅': 'تم حفظ الإعدادات ✅',
    'Are you sure you want to reset all data?': 'هل أنت متأكد من إعادة تعيين جميع البيانات؟',

    // ── Backup page ──────────────────────────────────────────────────────────
    'Create Backup': 'إنشاء نسخة احتياطية',
    'Import Backup': 'استيراد نسخة احتياطية',
    'Export JSON': 'تصدير JSON',
    'Backup downloaded as JSON': 'تم تنزيل النسخة الاحتياطية كـ JSON',
    'Backup imported! Data restored for this session.': 'تم استيراد النسخة الاحتياطية! تمت استعادة البيانات لهذه الجلسة.',
    'Running in static mode': 'يعمل في الوضع الثابت',
    'Data resets on refresh': 'تُعاد البيانات عند التحديث',

    // ── Messages page ────────────────────────────────────────────────────────
    'New Message': 'رسالة جديدة',
    'No messages': 'لا توجد رسائل',
    'All messages cleared': 'تم مسح جميع الرسائل',
    'Send': 'إرسال',
    'Reply': 'رد',
    'Read': 'مقروءة',
    'Unread': 'غير مقروءة',
    'System': 'النظام',
    'Broadcast': 'بث',

    // ── Commissions page ─────────────────────────────────────────────────────
    'All Doctors': 'جميع الأطباء',
    'All Months': 'جميع الأشهر',
    'All Years': 'جميع السنوات',
    'Generate Report': 'إنشاء تقرير',
    'Total Commission': 'إجمالي العمولة',
    'No commission data': 'لا توجد بيانات عمولة',

    // ── Installments / Payment Plans ─────────────────────────────────────────
    'New Payment Plan': 'خطة دفع جديدة',
    'No payment plans found': 'لم يتم العثور على خطط دفع',
    'Monthly': 'شهري',
    'Installment No.': 'رقم القسط',
    'Mark as Paid': 'تسجيل كمدفوع',
    'Payment Received': 'تم استلام الدفع',
    'Plan Total': 'إجمالي الخطة',
    'Paid So Far': 'المدفوع حتى الآن',

    // ── Discount Codes page ──────────────────────────────────────────────────
    'New Discount Code': 'كود خصم جديد',
    'No discount codes found': 'لم يتم العثور على أكواد خصم',
    'Percent (%)': 'نسبة مئوية (%)',
    'Fixed Amount': 'مبلغ ثابت',
    'Code copied!': 'تم نسخ الكود!',
    'Valid': 'صالح',
    'Invalid': 'غير صالح',
    'Expired': 'منتهي الصلاحية',

    // ── Abilities page ───────────────────────────────────────────────────────
    'Doctor Abilities': 'صلاحيات الطبيب',
    'Treatment Abilities': 'قدرات العلاج',
    'Save Abilities': 'حفظ الصلاحيات',
    'Abilities saved ✅': 'تم حفظ الصلاحيات ✅',
    'Select All': 'تحديد الكل',
    'Clear All': 'مسح الكل',

    // ── Employment page ──────────────────────────────────────────────────────
    'New Employee': 'موظف جديد',
    'No employees found': 'لم يتم العثور على موظفين',
    'Full Time': 'دوام كامل',
    'Part Time': 'دوام جزئي',
    'Contract': 'عقد',
    'Salary': 'الراتب',
    'Hire Date': 'تاريخ التعيين',
    'Position': 'المنصب',
    'Department': 'القسم',
    'National ID': 'الرقم القومي',

    // ── Services page ────────────────────────────────────────────────────────
    'New Service': 'خدمة جديدة',
    'No services found': 'لم يتم العثور على خدمات',
    'Base Price': 'السعر الأساسي',
    'Duration (min)': 'المدة (دقيقة)',
    'Service Name': 'اسم الخدمة',

    // ── Imaging page ─────────────────────────────────────────────────────────
    'Diagnostic Imaging': 'التصوير التشخيصي',
    'Upload X-Ray': 'رفع أشعة',
    'No images found': 'لم يتم العثور على صور',
    'Total Images': 'إجمالي الصور',
    'X-Ray Gallery': 'معرض الأشعة',
    'Periapical': 'ذروي',
    'Bitewing': 'جناحي',
    'Panoramic': 'بانورامي',
    'CBCT': 'CBCT',
    'Photo': 'صورة',
    'X-Ray loaded': 'تم تحميل الأشعة',
    'Findings': 'النتائج',

    // ── Insurance page ───────────────────────────────────────────────────────
    'Insurance Companies': 'شركات التأمين',
    'Insurance Policies': 'وثائق التأمين',
    'Insurance Claims': 'مطالبات التأمين',
    'New Company': 'شركة جديدة',
    'New Policy': 'وثيقة جديدة',
    'New Claim': 'مطالبة جديدة',
    'Policies & Claims': 'الوثائق والمطالبات',
    'Coverage %': 'نسبة التغطية %',
    'Max Coverage': 'الحد الأقصى للتغطية',
    'Claim Amount': 'مبلغ المطالبة',
    'Approved Amount': 'المبلغ الموافق عليه',
    'Submit Claim': 'تقديم مطالبة',
    'Total Claims': 'إجمالي المطالبات',
    'Pending Claims': 'المطالبات المعلقة',

    // ── Lab Orders page ──────────────────────────────────────────────────────
    'New Lab Order': 'طلب مختبر جديد',
    'No lab orders found': 'لم يتم العثور على طلبات مختبر',
    'Lab Name': 'اسم المختبر',
    'Order Type': 'نوع الطلب',
    'Mark as Sent': 'تسجيل كمرسل',
    'Mark as Received': 'تسجيل كمستلم',
    'Est. Cost': 'التكلفة التقديرية',
    'Crown': 'تاج',
    'Bridge': 'جسر',
    'Denture': 'طقم',
    'Aligner': 'مثبت',

    // ── Suppliers page ───────────────────────────────────────────────────────
    'New Supplier': 'مورد جديد',
    'No suppliers found': 'لم يتم العثور على موردين',
    'Contact Person': 'شخص الاتصال',
    'Website': 'الموقع الإلكتروني',
    'Supplier updated ✅': 'تم تحديث المورد ✅',
    'Supplier added ✅': 'تم إضافة المورد ✅',

    // ── Working Hours page ───────────────────────────────────────────────────
    'Clock In': 'تسجيل الدخول',
    'Clock Out': 'تسجيل الخروج',
    'Manual Entry': 'إدخال يدوي',
    'No records found': 'لم يتم العثور على سجلات',
    'Clocked in': 'تم تسجيل الدخول',
    'Clocked out': 'تم تسجيل الخروج',
    'Hours Worked': 'الساعات المعمولة',
    'Overtime Hours': 'ساعات إضافية',
    'Late': 'متأخر',
    'On Time': 'في الوقت المحدد',
    'Monthly Summary': 'ملخص شهري',
    'Work Date': 'تاريخ العمل',

    // ── Bulk Expense page ────────────────────────────────────────────────────
    'Bulk Expense Entry': 'إدخال مصروفات جماعية',
    'Salary Payments': 'دفعات الرواتب',
    'Lab Payments': 'دفعات المختبر',
    'Add Row': 'إضافة صف',
    'Submit All': 'إرسال الكل',
    'Batches Submitted': 'الدفعات المُرسَلة',
    'No active employees with salaries found': 'لم يتم العثور على موظفين نشطين برواتب',
    'No received lab orders with cost found': 'لم يتم العثور على طلبات مختبر مستلمة بتكلفة',

    // ── Feedback page ────────────────────────────────────────────────────────
    'New Feedback': 'تقييم جديد',
    'No feedback found': 'لم يتم العثور على تقييمات',
    'Average Rating': 'متوسط التقييم',
    'Total Reviews': 'إجمالي التقييمات',
    'Positive': 'إيجابي',
    'Neutral': 'محايد',
    'Negative': 'سلبي',
    'Overall Experience': 'التجربة العامة',
    'Staff Friendliness': 'ود الموظفين',
    'Cleanliness Rating': 'تقييم النظافة',
    'Would Recommend': 'سيوصي بالعيادة',
    'Visit Date': 'تاريخ الزيارة',
    'Anonymous': 'مجهول الهوية',

    // ── Prescription page ────────────────────────────────────────────────────
    'New Prescription': 'وصفة طبية جديدة',
    'No prescriptions found': 'لم يتم العثور على وصفات طبية',
    'Medication': 'الدواء',
    'Dosage': 'الجرعة',
    'Frequency': 'التكرار',
    'Duration (days)': 'المدة (أيام)',
    'Instructions': 'التعليمات',
    'Print Prescription': 'طباعة الوصفة',

    // ── Receipts page ────────────────────────────────────────────────────────
    'New Receipt': 'إيصال جديد',
    'No receipts found': 'لم يتم العثور على إيصالات',
    'Receipt No.': 'رقم الإيصال',
    'Print Receipt': 'طباعة الإيصال',
    'Subtotal': 'المجموع الفرعي',
    'Tax': 'الضريبة',

    // ── Page Access page ─────────────────────────────────────────────────────
    'Page Access Control': 'التحكم في صلاحيات الصفحات',
    'Save Access Rules': 'حفظ قواعد الوصول',
    'Reset to Default': 'إعادة إلى الافتراضي',
    'Access saved': 'تم حفظ الصلاحيات',

    // ── Toast messages ───────────────────────────────────────────────────────
    'Welcome back': 'مرحباً بعودتك',
    'Logged out': 'تم تسجيل الخروج',
    'Saved successfully': 'تم الحفظ بنجاح',
    'An error occurred': 'حدث خطأ ما',
    'Deleted successfully': 'تم الحذف بنجاح',
    'Patient registered ✅': 'تم تسجيل المريض ✅',
    'Patient updated ✅': 'تم تحديث المريض ✅',
    'Patient deleted': 'تم حذف المريض',
    'Appointment scheduled ✅': 'تم جدولة الموعد ✅',
    'Appointment updated ✅': 'تم تحديث الموعد ✅',
    'Appointment deleted': 'تم حذف الموعد',
    'Treatment added ✅': 'تم إضافة العلاج ✅',
    'Treatment deleted': 'تم حذف العلاج',
    'Transaction added ✅': 'تم إضافة المعاملة ✅',
    'Transaction deleted': 'تم حذف المعاملة',
    'Doctor added ✅': 'تم إضافة الطبيب ✅',
    'Doctor updated ✅': 'تم تحديث الطبيب ✅',
    'Doctor deleted': 'تم حذف الطبيب',
    'Item added ✅': 'تم إضافة الصنف ✅',
    'Item updated ✅': 'تم تحديث الصنف ✅',
    'Item deleted': 'تم حذف الصنف',
    'User created ✅': 'تم إنشاء المستخدم ✅',
    'User updated ✅': 'تم تحديث المستخدم ✅',
    'User deleted': 'تم حذف المستخدم',
    'Copied to clipboard': 'تم النسخ إلى الحافظة',
    'No follow-ups or overdue payments due': 'لا توجد متابعات أو مدفوعات متأخرة',
    'Invalid credentials': 'بيانات الاعتماد غير صحيحة',
    'All fields required': 'جميع الحقول مطلوبة',
    'Added to queue ✅': 'تم الإضافة للدور ✅',
    'Removed from queue': 'تم الإزالة من الدور',
    'Queue cleared': 'تم مسح الدور',

    // ── Months ───────────────────────────────────────────────────────────────
    'January': 'يناير', 'February': 'فبراير', 'March': 'مارس',
    'April': 'أبريل', 'May': 'مايو', 'June': 'يونيو',
    'July': 'يوليو', 'August': 'أغسطس', 'September': 'سبتمبر',
    'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر',
    'Jan': 'يناير', 'Feb': 'فبراير', 'Mar': 'مارس',
    'Apr': 'أبريل', 'Jun': 'يونيو', 'Jul': 'يوليو',
    'Aug': 'أغسطس', 'Sep': 'سبتمبر', 'Oct': 'أكتوبر',
    'Nov': 'نوفمبر', 'Dec': 'ديسمبر',

    // ── Days ─────────────────────────────────────────────────────────────────
    'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء',
    'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت',
    'Sunday': 'الأحد',
    'Mon': 'الاث', 'Tue': 'الثل', 'Wed': 'الأر',
    'Thu': 'الخم', 'Fri': 'الجم', 'Sat': 'السب', 'Sun': 'الأح',
  };

  // ── State ──────────────────────────────────────────────────────────────────
  let _lang = localStorage.getItem('dentcare_lang') || 'en';

  // ── Core translate function ────────────────────────────────────────────────
  function translate(key, vars) {
    if (!key) return key;
    let text = key;
    if (_lang === 'ar') {
      text = AR[key] || key;
    }
    // Variable substitution: T('Hello {name}', {name: 'Ali'})
    if (vars) {
      Object.keys(vars).forEach(function(k) {
        text = text.replace(new RegExp('{' + k + '}', 'g'), vars[k]);
      });
    }
    return text;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  translate.lang = _lang;

  translate.setLang = function(lang) {
    _lang = lang;
    translate.lang = lang;
    localStorage.setItem('dentcare_lang', lang);
    // Apply RTL
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.classList.toggle('lang-ar', lang === 'ar');
    document.body.classList.toggle('lang-en', lang !== 'ar');
    // Re-translate all [data-t] elements
    translate.applyAll();
  };

  translate.isAr = function() { return _lang === 'ar'; };

  // Translate a DOM element and all its [data-t] children
  translate.apply = function(el) {
    if (!el) return;
    var els = el.querySelectorAll ? el.querySelectorAll('[data-t]') : [];
    Array.prototype.forEach.call(els, function(node) {
      var key = node.getAttribute('data-t');
      if (key) node.textContent = translate(key);
    });
    // Also translate placeholders
    var inputs = el.querySelectorAll ? el.querySelectorAll('[data-t-ph]') : [];
    Array.prototype.forEach.call(inputs, function(node) {
      var key = node.getAttribute('data-t-ph');
      if (key) node.placeholder = translate(key);
    });
  };

  // Translate entire document
  translate.applyAll = function() {
    translate.apply(document.body);
  };

  // Get Arabic text for a key (useful for JS-generated HTML)
  translate.ar = function(key) {
    return AR[key] || key;
  };

  // Build a translated <th> string
  translate.th = function(key) {
    return '<th data-t="' + key + '">' + translate(key) + '</th>';
  };

  // Build translated button text
  translate.btn = function(key, extra) {
    return '<span data-t="' + key + '">' + translate(key) + '</span>' + (extra || '');
  };

  // Init
  document.addEventListener('DOMContentLoaded', function() {
    // Apply saved language on load
    if (_lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
      document.body.classList.add('lang-ar');
    }
    translate.applyAll();
  });

  return translate;
})();
