import React, { useState, useCallback } from 'react';

// Make TypeScript aware of the XLSX global variable from the CDN script in index.html
declare var XLSX: any;

interface Contact {
  name: string;
  phone: string;
}

const App: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleAddContacts = useCallback(() => {
    if (!inputValue.trim()) {
      setError('الرجاء إدخال نص يحتوي على أسماء وأرقام.');
      return;
    }

    const lines = inputValue.split('\n');
    const newContacts: Contact[] = [];
    const existingPhones = new Set(contacts.map(c => c.phone));

    lines.forEach(line => {
      if (!line.trim()) return;

      // Find a sequence of digits that looks like a phone number.
      // This is more robust than splitting by space.
      const phoneMatch = line.match(/\+?[0-9\s-]{7,}/);
      
      if (!phoneMatch) return; // Skip lines without a clear number

      const phoneRaw = phoneMatch[0];
      // Clean the phone number to be digits only
      const phoneClean = phoneRaw.replace(/\D/g, '');

      // The rest of the string is the name
      const nameRaw = line.replace(phoneRaw, '');
      // Clean the name from anything that isn't a letter or space
      const nameClean = nameRaw.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim();
      
      // Add if both name and phone are valid and phone doesn't already exist
      if (nameClean && phoneClean && !existingPhones.has(phoneClean)) {
        newContacts.push({ name: nameClean, phone: phoneClean });
        existingPhones.add(phoneClean); // Add to set to check duplicates within the same batch
      }
    });

    if (newContacts.length === 0) {
      setError('لم يتم العثور على بيانات جديدة أو صالحة في النص المدخل.');
      return;
    }

    const updatedContacts = [...contacts, ...newContacts];
    
    // Sort alphabetically by name, using 'ar' locale for proper Arabic character sorting.
    updatedContacts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    setContacts(updatedContacts);
    setInputValue('');
    setError('');
  }, [inputValue, contacts]);

  const handleDownload = useCallback(() => {
    if (contacts.length === 0) return;

    // Prepare data with correct headers for the worksheet.
    const dataToExport = contacts.map(contact => ({
      "الاسم": contact.name,
      "رقم التليفون": contact.phone,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأسماء والأرقام");

    // Trigger the file download.
    XLSX.writeFile(wb, "الأسماء_والأرقام.xlsx");
  }, [contacts]);

  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center font-sans p-4" dir="rtl">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">مدير الأسماء والأرقام</h1>
          <p className="text-gray-500 mt-2">أدخل الأسماء مع أرقام الهواتف لتنظيمها وتصديرها بضغطة زر.</p>
        </header>

        <div className="space-y-4">
          <div className="flex flex-col gap-3">
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError('');
              }}
              placeholder="مثال:&#10;محمد عبدالله 0551234567&#10;فاطمة خالد, 0509876543&#10;سارة علي - 0588765432"
              rows={6}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-lg"
            />
            <button
              onClick={handleAddContacts}
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 shadow-sm text-lg"
            >
              إضافة البيانات
            </button>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </div>

        <div className="border-t border-gray-200 pt-6 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
               <h2 className="text-2xl font-semibold text-gray-700">قائمة البيانات</h2>
               <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full">
                 الإجمالي: {contacts.length} سجل
               </span>
            </div>
            <button
              onClick={handleDownload}
              disabled={contacts.length === 0}
              className="bg-green-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>تحميل Excel</span>
            </button>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg h-72 overflow-y-auto">
            {contacts.length > 0 ? (
                <table className="w-full text-right table-auto">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200">الاسم</th>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200">رقم التليفون</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {contacts.map((contact, index) => (
                        <tr key={`${contact.phone}-${index}`} className="hover:bg-gray-100">
                            <td className="p-3 text-gray-800 text-lg">{contact.name}</td>
                            <td className="p-3 text-gray-600 text-lg font-mono text-left" dir="ltr">{contact.phone}</td>
                        </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">القائمة فارغة حاليًا.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
