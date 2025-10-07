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
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedContact, setEditedContact] = useState<Contact>({ name: '', phone: '' });

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

      const phoneMatch = line.match(/\+?[0-9\s-]{7,}/);
      if (!phoneMatch) return;

      const phoneRaw = phoneMatch[0];
      const phoneClean = phoneRaw.replace(/\D/g, '');
      const nameRaw = line.replace(phoneRaw, '');
      const nameClean = nameRaw.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '').trim();
      
      if (nameClean && phoneClean && !existingPhones.has(phoneClean)) {
        newContacts.push({ name: nameClean, phone: phoneClean });
        existingPhones.add(phoneClean);
      }
    });

    if (newContacts.length === 0) {
      setError('لم يتم العثور على بيانات جديدة أو صالحة في النص المدخل.');
      return;
    }

    const updatedContacts = [...contacts, ...newContacts];
    updatedContacts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));

    setContacts(updatedContacts);
    setInputValue('');
    setError('');
  }, [inputValue, contacts]);

  const handleDownload = useCallback(() => {
    if (contacts.length === 0) return;

    const dataToExport = contacts.map(contact => ({
      "الاسم": contact.name,
      "رقم التليفون": contact.phone,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأسماء والأرقام");

    XLSX.writeFile(wb, "الأسماء_والأرقام.xlsx");
  }, [contacts]);

  const handleEdit = (contact: Contact, index: number) => {
    setEditingIndex(index);
    setEditedContact({ ...contact });
    setError('');
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setError('');
  };

  const handleSave = (indexToSave: number) => {
    if (!editedContact.name.trim() || !editedContact.phone.trim()) {
      setError('لا يمكن ترك الاسم أو رقم الهاتف فارغًا.');
      return;
    }
    const phoneExists = contacts.some((c, i) => c.phone === editedContact.phone && i !== indexToSave);
    if (phoneExists) {
      setError('رقم الهاتف هذا موجود بالفعل.');
      return;
    }

    const updatedContacts = [...contacts];
    updatedContacts[indexToSave] = editedContact;
    updatedContacts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    
    setContacts(updatedContacts);
    setEditingIndex(null);
    setError('');
  };

  const handleDeleteContact = useCallback((indexToDelete: number) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
      setContacts(prev => prev.filter((_, index) => index !== indexToDelete));
    }
  }, []);

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedContact(prev => ({ ...prev, [name]: name === 'phone' ? value.replace(/\D/g, '') : value }));
  };


  return (
    <div className="bg-gray-50 min-h-screen flex items-center justify-center font-sans p-4" dir="rtl">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-lg space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">مدير الأسماء والأرقام</h1>
          <p className="text-gray-500 mt-2">أدخل، عدّل، ونظّم الأسماء مع أرقام الهواتف لتصديرها بضغطة زر.</p>
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
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-lg disabled:bg-gray-100"
              disabled={editingIndex !== null}
            />
            <button
              onClick={handleAddContacts}
              disabled={editingIndex !== null}
              className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 shadow-sm text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              إضافة البيانات
            </button>
          </div>
          {error && editingIndex === null && <p className="text-red-500 text-sm text-center">{error}</p>}
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
              disabled={contacts.length === 0 || editingIndex !== null}
              className="bg-green-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>تحميل Excel</span>
            </button>
          </div>
          {error && editingIndex !== null && <p className="text-red-500 text-sm text-center -mb-2">{error}</p>}
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg h-72 overflow-y-auto">
            {contacts.length > 0 ? (
                <table className="w-full text-right table-auto">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200">الاسم</th>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200">رقم التليفون</th>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200 text-center w-32">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {contacts.map((contact, index) => (
                        <tr key={`${contact.phone}-${index}`} className={editingIndex === index ? "bg-yellow-50" : "hover:bg-gray-100"}>
                           {editingIndex === index ? (
                            <>
                              <td className="p-2 align-middle">
                                  <input
                                      type="text"
                                      name="name"
                                      value={editedContact.name}
                                      onChange={handleEditInputChange}
                                      className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 text-lg"
                                      aria-label="Edit Name"
                                  />
                              </td>
                              <td className="p-2 align-middle">
                                  <input
                                      type="text"
                                      name="phone"
                                      value={editedContact.phone}
                                      onChange={handleEditInputChange}
                                      className="w-full p-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-left text-lg"
                                      dir="ltr"
                                      aria-label="Edit Phone"
                                  />
                              </td>
                              <td className="p-2 align-middle">
                                  <div className="flex items-center justify-center gap-3">
                                      <button onClick={() => handleSave(index)} className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full" aria-label="Save changes">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                      </button>
                                      <button onClick={handleCancel} className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full" aria-label="Cancel edit">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                      </button>
                                  </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 text-gray-800 text-lg">{contact.name}</td>
                              <td className="p-3 text-gray-600 text-lg font-mono text-left" dir="ltr">{contact.phone}</td>
                              <td className="p-3 align-middle">
                                  <div className="flex items-center justify-center gap-4">
                                      <button onClick={() => handleEdit(contact, index)} disabled={editingIndex !== null} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed" aria-label={`Edit ${contact.name}`}>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                                          </svg>
                                      </button>
                                      <button onClick={() => handleDeleteContact(index)} disabled={editingIndex !== null} className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed" aria-label={`Delete ${contact.name}`}>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                      </button>
                                  </div>
                              </td>
                            </>
                          )}
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
