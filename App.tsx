import React, { useState, useCallback, useEffect } from 'react';

// Make TypeScript aware of the XLSX global variable from the CDN script in index.html
declare var XLSX: any;

interface Contact {
  name: string;
  phone: string;
}

const App: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    try {
      const savedContacts = window.localStorage.getItem('contacts');
      return savedContacts ? JSON.parse(savedContacts) : [];
    } catch (error) {
      console.error("Failed to load contacts from localStorage", error);
      return [];
    }
  });

  const [inputValue, setInputValue] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedContact, setEditedContact] = useState<Contact>({ name: '', phone: '' });
  const [editError, setEditError] = useState<{ name?: string; phone?: string }>({});

  useEffect(() => {
    try {
      window.localStorage.setItem('contacts', JSON.stringify(contacts));
    } catch (error) {
      console.error("Failed to save contacts to localStorage", error);
    }
  }, [contacts]);

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
    setEditError({});
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setError('');
    setEditError({});
  };

  const handleSave = (indexToSave: number) => {
    const newErrors: { name?: string; phone?: string } = {};
    const trimmedName = editedContact.name.trim();
    const trimmedPhone = editedContact.phone.trim();

    if (!trimmedName) {
      newErrors.name = 'الاسم لا يمكن أن يكون فارغًا.';
    }

    if (!trimmedPhone) {
      newErrors.phone = 'رقم الهاتف لا يمكن أن يكون فارغًا.';
    } else if (trimmedPhone.length < 7) {
      newErrors.phone = 'يجب أن يتكون الرقم من 7 أرقام على الأقل.';
    } else if (contacts.some((c, i) => c.phone === trimmedPhone && i !== indexToSave)) {
      newErrors.phone = 'رقم الهاتف هذا موجود بالفعل.';
    }

    if (Object.keys(newErrors).length > 0) {
      setEditError(newErrors);
      return;
    }
    
    const updatedContacts = [...contacts];
    updatedContacts[indexToSave] = { name: trimmedName, phone: trimmedPhone };
    updatedContacts.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    
    setContacts(updatedContacts);
    setEditingIndex(null);
    setEditError({});
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
    if (editError[name as keyof typeof editError]) {
      setEditError(prev => ({ ...prev, [name]: undefined }));
    }
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
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg h-72 overflow-y-auto">
            {contacts.length > 0 ? (
                <table className="w-full text-right table-auto">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200">الاسم</th>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200">رقم التليفون</th>
                            <th className="p-3 text-lg font-semibold text-gray-600 border-b-2 border-gray-200 text-center w-40">الإجراءات</th>
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
                                      className={`w-full p-2 border ${editError.name ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 text-lg`}
                                      aria-label="Edit Name"
                                      aria-invalid={!!editError.name}
                                      aria-describedby={editError.name ? "name-error" : undefined}
                                  />
                                  {editError.name && <p id="name-error" className="text-red-500 text-xs mt-1">{editError.name}</p>}
                              </td>
                              <td className="p-2 align-middle">
                                  <input
                                      type="text"
                                      name="phone"
                                      value={editedContact.phone}
                                      onChange={handleEditInputChange}
                                      className={`w-full p-2 border ${editError.phone ? 'border-red-500' : 'border-blue-300'} rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-left text-lg`}
                                      dir="ltr"
                                      aria-label="Edit Phone"
                                      aria-invalid={!!editError.phone}
                                      aria-describedby={editError.phone ? "phone-error" : undefined}
                                  />
                                   {editError.phone && <p id="phone-error" className="text-red-500 text-xs mt-1 text-left" dir="ltr">{editError.phone}</p>}
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
                                  <div className="flex items-center justify-center gap-3">
                                      <button onClick={() => handleEdit(contact, index)} disabled={editingIndex !== null} className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed" aria-label={`Edit ${contact.name}`}>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                                          </svg>
                                      </button>
                                      <button 
                                        onClick={() => window.open(`https://wa.me/${contact.phone}`, '_blank', 'noopener,noreferrer')} 
                                        disabled={editingIndex !== null} 
                                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed" 
                                        aria-label={`Send WhatsApp to ${contact.name}`}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
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
