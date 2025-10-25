# 🧪 LUMA Claude MCP Tool Test Planı

**Test Tarihi:** 25 Ekim 2025  
**Claude Model:** claude-sonnet-4-20250514  
**Toplam Tool Sayısı:** 18 adet  
**Test Workspace:** `C:\Users\emrah badas\OneDrive\Desktop\kodlama\Yeni klasör (7)`

---

## 🎯 Test Felsefesi

✅ **Her tool için 1 test** - Tekrara gerek yok  
✅ **Doğal dil komutları** - "dir çalıştır" yerine "dosyaları listele"  
✅ **Bağlam ölçümü** - Claude'un niyeti anlama kabiliyeti  
✅ **Gerçek kullanım senaryoları** - Yapay testler değil  

---

## 📋 Test Kategorileri

### **Kategori 1: Dosya İşlemleri (8 Tool)**
### **Kategori 2: Kod Analizi & Geliştirme (6 Tool)**
### **Kategori 3: Sistem İşlemleri (2 Tool)**
### **Kategori 4: Advanced Editör (2 Tool)**

---

## 🎯 Detaylı Test Senaryoları

### **KATEGORI 1: DOSYA İŞLEMLERİ (8 Tool)**

---

#### **Test 1: `read_file` - Dosya İçeriği Okuma**

**🎤 Doğal Komut:** "merhaba hayat yazısının bulunduğu dosyayı bul ve içeriğini göster"

**🧠 Niyet Ölçümü:**
- Claude'un "merhaba hayat" → dbc.txt ilişkisini kurması
- Önce search, sonra read_file kullanması
- İçeriği doğru göstermesi

**✅ Başarı Kriteri:**
- [ ] dbc.txt dosyasını buldu
- [ ] İçeriği okudu: "Merhaba Hayat"
- [ ] Sonucu eksiksiz gösterdi

---

#### **Test 2: `list_directory` - Çalışma Dizini Analizi**

**🎤 Doğal Komut:** "hangi dosyalarla çalışıyoruz göster bana"

**🧠 Niyet Ölçümü:**
- "hangi dosyalarla çalışıyoruz" → list_directory anlaması
- Workspace root'u algılaması
- Dosyaları anlamlı şekilde sunması

**✅ Başarı Kriteri:**
- [ ] list_directory tool'unu kullandı
- [ ] Tüm dosyaları listeledi (dbc.txt, index.html, script.js, style.css, src/)
- [ ] Klasör ve dosya ayrımı yaptı

---

#### **Test 3: `search_files` - Pattern Matching**

**🎤 Doğal Komut:** "JavaScript dosyalarını bulabilir misin"

**🧠 Niyet Ölçümü:**
- "JavaScript dosyaları" → *.js pattern'ini çıkarması
- search_files tool'unu kullanması
- Bulunan dosyaları açıklayıcı şekilde göstermesi

**✅ Başarı Kriteri:**
- [ ] *.js pattern kullandı
- [ ] script.js dosyasını buldu
- [ ] Dosya yolunu doğru gösterdi

---

#### **Test 4: `get_file_tree` - Proje Yapısı Görselleştirme**

**🎤 Doğal Komut:** "projenin genel yapısını tree formatında göster"

**🧠 Niyet Ölçümü:**
- "tree formatında" → get_file_tree çıkarımı
- Derinlik parametresini akıllıca seçmesi
- Okunabilir format sunması

**✅ Başarı Kriteri:**
- [ ] get_file_tree tool'unu kullandı
- [ ] Klasör yapısını tree formatında gösterdi
- [ ] src/ alt klasörünü de gösterdi

---

#### **Test 5: `write_file` - Dosya Oluşturma**

**🎤 Doğal Komut:** "notlar için bir TODO.md dosyası oluştur, içine 3 örnek görev ekle"

**🧠 Niyet Ölçümü:**
- Dosya formatını anlama (.md)
- İçerik üretme kabiliyeti
- Markdown formatını kullanma

**✅ Başarı Kriteri:**
- [ ] TODO.md dosyasını oluşturdu
- [ ] Markdown formatında 3 görev ekledi
- [ ] Dosya başarıyla kaydedildi

---

#### **Test 6: `create_directory` - Klasör Yapısı Oluşturma**

**🎤 Doğal Komut:** "proje dosyalarını organize etmek için bir 'assets' klasörü lazım"

**🧠 Niyet Ölçümü:**
- "lazım" → create_directory çıkarımı
- Klasör adını doğru algılama
- İşlem sonucunu açıklama

**✅ Başarı Kriteri:**
- [ ] create_directory kullandı
- [ ] assets/ klasörünü oluşturdu
- [ ] Başarı mesajı verdi

---

#### **Test 7: `move_file` - Dosya Organizasyonu**

**🎤 Doğal Komut:** "stil dosyalarını assets klasörüne taşı"

**🧠 Niyet Ölçümü:**
- "stil dosyaları" → style.css çıkarımı
- move_file tool'unu kullanma
- Hedef path'i doğru oluşturma (assets/style.css)

**✅ Başarı Kriteri:**
- [ ] style.css dosyasını buldu
- [ ] assets/style.css olarak taşıdı
- [ ] Dosya başarıyla taşındı

---

#### **Test 8: `delete_file` - Dosya Temizleme**

**🎤 Doğal Komut:** "TODO listesini tamamladık, artık gerek yok"

**🧠 Niyet Ölçümü:**
- "artık gerek yok" → delete çıkarımı
- TODO.md dosyasını hatırlama (önceki testten)
- Güvenli silme işlemi

**✅ Başarı Kriteri:**
- [ ] TODO.md dosyasını tanımladı
- [ ] delete_file kullandı
- [ ] Dosya başarıyla silindi

---

### **KATEGORI 2: KOD ANALİZİ & GELİŞTİRME (6 Tool)**

---

#### **Test 9: `code_analyzer` - Kod Kalitesi Analizi**

**🎤 Doğal Komut:** "JavaScript kodumuzu incele, sorunları ve iyileştirme alanlarını bul"

**🧠 Niyet Ölçümü:**
- "JavaScript kodumuzu" → script.js çıkarımı
- Önce dosyayı okuma, sonra analiz
- Yapıcı öneriler sunma

**✅ Başarı Kriteri:**
- [ ] script.js dosyasını okudu
- [ ] code_analyzer ile analiz etti
- [ ] eval() güvenlik riskini tespit etti
- [ ] İyileştirme önerileri sundu

---

#### **Test 10: `explain_code` - Kod Dokümantasyonu**

**🎤 Doğal Komut:** "hesaplama fonksiyonumuz nasıl çalışıyor açıkla"

**🧠 Niyet Ölçümü:**
- "hesaplama fonksiyonu" → calculate() çıkarımı
- script.js içinden doğru fonksiyonu bulma
- Detaylı açıklama yapma

**✅ Başarı Kriteri:**
- [ ] calculate() fonksiyonunu buldu
- [ ] explain_code tool'unu kullandı
- [ ] Fonksiyonun ne yaptığını açıkladı
- [ ] eval() kullanımını vurguladı

---

#### **Test 11: `find_bugs` - Güvenlik & Bug Taraması**

**🎤 Doğal Komut:** "kodumuzdaki güvenlik açıklarını tara"

**🧠 Niyet Ölçümü:**
- "güvenlik açıkları" → find_bugs + security flag
- Tüm kod dosyalarını tarama
- Öncelikli sorunları belirleme

**✅ Başarı Kriteri:**
- [ ] find_bugs tool'unu kullandı
- [ ] check_security: true parametresi ekledi
- [ ] eval() kullanımını güvenlik riski olarak işaretledi
- [ ] XSS/Injection risklerini vurguladı

---

#### **Test 12: `refactor_code` - Kod İyileştirme**

**🎤 Doğal Komut:** "hesaplama kodunu modern ve güvenli hale getir"

**🧠 Niyet Ölçümü:**
- "modern ve güvenli" → refactor with security focus
- eval() yerine alternatif önerme
- ES6+ syntax kullanma

**✅ Başarı Kriteri:**
- [ ] refactor_code kullandı
- [ ] eval() yerine güvenli parser önerdi
- [ ] Modern JavaScript syntax (arrow functions, const/let)
- [ ] İyileştirilmiş kodu sundu

---

#### **Test 13: `code_generator` - Yeni Kod Üretimi**

**🎤 Doğal Komut:** "TypeScript ile basit bir user class'ı yaz, name ve email property'leri olsun"

**🧠 Niyet Ölçümü:**
- Dil seçimi (TypeScript)
- Class yapısı anlayışı
- Property tanımlama

**✅ Başarı Kriteri:**
- [ ] code_generator kullandı
- [ ] TypeScript syntax ile class oluşturdu
- [ ] name ve email property'lerini ekledi
- [ ] Çalışan kod üretildi

---

#### **Test 14: `write_tests` - Test Otomasyonu**

**🎤 Doğal Komut:** "hesaplama fonksiyonu için Jest testleri hazırla"

**🧠 Niyet Ölçümü:**
- "Jest testleri" → test framework belirtme
- calculate() fonksiyonu için testler
- Edge case'leri düşünme

**✅ Başarı Kriteri:**
- [ ] write_tests kullandı
- [ ] Jest syntax ile testler yazdı
- [ ] Başarılı hesaplama testi
- [ ] Hatalı input testi (eval error)

---

### **KATEGORI 3: SİSTEM İŞLEMLERİ (2 Tool)**

---

#### **Test 15: `run_terminal_command` - Proje Build**

**🎤 Doğal Komut:** "projeyi derle ve çalıştır"

**🧠 Niyet Ölçümü:**
- "derle" → build command çıkarımı
- package.json'dan script bulma
- npm run dev veya benzeri komut

**✅ Başarı Kriteri:**
- [ ] run_terminal_command kullandı
- [ ] npm run dev veya node script.js çalıştırdı
- [ ] Komut çıktısını gösterdi
- [ ] Başarı/hata durumunu raporladı

---

#### **Test 16: `run_tests` - Test Suite Çalıştırma**

**🎤 Doğal Komut:** "testleri çalıştır, sonuçları göster"

**🧠 Niyet Ölçümü:**
- "testleri çalıştır" → run_tests tool'u
- Test framework algılama
- Sonuçları yorumlama

**✅ Başarı Kriteri:**
- [ ] run_tests kullandı
- [ ] Test sonuçlarını gösterdi
- [ ] Pass/fail durumlarını raporladı
- [ ] (Test yoksa uyarı verdi)

---

### **KATEGORI 4: ADVANCED EDITÖR (2 Tool)**

---

#### **Test 17: `str_replace_editor` - View & Analiz**

**🎤 Doğal Komut:** "script.js dosyasının 1-20 satırlarını göster"

**🧠 Niyet Ölçümü:**
- Satır aralığı belirtme
- view command kullanımı
- view_range parametresi

**✅ Başarı Kriteri:**
- [ ] str_replace_editor: view kullandı
- [ ] view_range: [1, 20] parametresi
- [ ] Satır numaralı çıktı verdi

---

#### **Test 18: `str_replace_editor` - Precision Edit**

**🎤 Doğal Komut:** "calculate fonksiyonunun adını computeExpression olarak değiştir"

**🧠 Niyet Ölçümü:**
- Fonksiyon adı değişikliği → str_replace
- Tüm kullanım yerlerini bulma
- Dikkatli string matching

**✅ Başarı Kriteri:**
- [ ] str_replace_editor: str_replace kullandı
- [ ] old_str: "function calculate" buldu
- [ ] new_str: "function computeExpression" ile değiştirdi
- [ ] Değişiklik başarılı oldu

---

## 📊 Test Sonuç Özeti

| Kategori | Tool Sayısı | Başarılı | Başarısız | Başarı Oranı |
|----------|-------------|----------|-----------|--------------|
| Dosya İşlemleri | 8 | - | - | - % |
| Kod Analizi & Geliştirme | 6 | - | - | - % |
| Sistem İşlemleri | 2 | - | - | - % |
| Advanced Editör | 2 | - | - | - % |
| **TOPLAM** | **18** | **-** | **-** | **- %** |

---

## 🎯 Hızlı Test Komutları (Kopyala-Yapıştır)

Test sırasını takip etmek için aşağıdaki komutları sırayla kullanın:

### **📁 Dosya İşlemleri (Test 1-8)**

```
1. merhaba hayat yazısının bulunduğu dosyayı bul ve içeriğini göster
2. hangi dosyalarla çalışıyoruz göster bana
3. JavaScript dosyalarını bulabilir misin
4. projenin genel yapısını tree formatında göster
5. notlar için bir TODO.md dosyası oluştur, içine 3 örnek görev ekle
6. proje dosyalarını organize etmek için bir 'assets' klasörü lazım
7. stil dosyalarını assets klasörüne taşı
8. TODO listesini tamamladık, artık gerek yok
```

### **💻 Kod Analizi & Geliştirme (Test 9-14)**

```
9. JavaScript kodumuzu incele, sorunları ve iyileştirme alanlarını bul
10. hesaplama fonksiyonumuz nasıl çalışıyor açıkla
11. kodumuzdaki güvenlik açıklarını tara
12. hesaplama kodunu modern ve güvenli hale getir
13. TypeScript ile basit bir user class'ı yaz, name ve email property'leri olsun
14. hesaplama fonksiyonu için Jest testleri hazırla
```

### **⚙️ Sistem İşlemleri (Test 15-16)**

```
15. projeyi derle ve çalıştır
16. testleri çalıştır, sonuçları göster
```

### **✏️ Advanced Editör (Test 17-18)**

```
17. script.js dosyasının 1-20 satırlarını göster
18. calculate fonksiyonunun adını computeExpression olarak değiştir
```

---

## 🔍 Değerlendirme Kriterleri

### **A. Tool Seçimi (40 puan)**

- ✅ Doğru tool'u seçti
- ✅ Gereksiz tool kullanmadı
- ✅ Tool kombinasyonları akıllıca (search → read)

### **B. Niyet Anlama (30 puan)**

- ✅ Doğal dildeki komutu anladı
- ✅ Parametreleri doğru çıkardı
- ✅ Bağlamı korudu (önceki testleri hatırladı)

### **C. Sonuç Kalitesi (20 puan)**

- ✅ İşlem başarıyla tamamlandı
- ✅ Sonuç açıklayıcı ve doğru
- ✅ Hata yönetimi uygun

### **D. Kullanıcı Deneyimi (10 puan)**

- ✅ Yanıt hızı kabul edilebilir
- ✅ Açıklamalar anlaşılır
- ✅ Ek bilgi/öneri sundu

**Toplam Puan:** _____ / 100

---

## 📝 Test Notları & Gözlemler

### **Güçlü Yönler:**

- [ ] Tool seçimi isabetli
- [ ] Doğal dil anlama başarılı
- [ ] Hata yönetimi sağlam
- [ ] _________________

### **İyileştirme Alanları:**

- [ ] _________________
- [ ] _________________
- [ ] _________________

### **Beklenmeyen Davranışlar:**

- [ ] _________________
- [ ] _________________

---

## ✅ Test Tamamlama Checklist

- [ ] Tüm 18 test tamamlandı
- [ ] Başarı oranı hesaplandı (%80+)
- [ ] Kritik hatalar yok
- [ ] Güvenlik testleri geçti
- [ ] Test sonuçları dokümante edildi
- [ ] İyileştirme önerileri listelendi

**Test Tarihi:** ___________  
**Test Eden:** ___________  
**Sonuç:** ☐ Başarılı  ☐ Kısmi Başarı  ☐ Başarısız