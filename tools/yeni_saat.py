#!/usr/bin/env python3
"""Yeni bir PixelTime Saat kimliği üretir.

Kullanım:  python3 tools/yeni_saat.py PT-0001
Çıktı:
  1) Supabase SQL Editor'e yapıştırılacak satır (saati veritabanına ekler)
  2) firmware/pixeltime_sync/cihaz_kimligi.h  (saate yüklenecek gizli kimlik)
  3) Kutudaki karta basılacak eşleştirme kodu

cihaz_kimligi.h GİZLİDİR, GitHub'a yüklenmez (.gitignore'da).
"""
import secrets, sys, re, pathlib

serial = (sys.argv[1] if len(sys.argv) > 1 else '').upper()
if not re.fullmatch(r'PT-[0-9A-Z]{4,10}', serial):
    sys.exit('Seri numarası PT-0001 gibi olmalı.')
alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'          # karışan harfler (0/O, 1/I) yok
code = ''.join(secrets.choice(alphabet) for _ in range(6))
secret = secrets.token_hex(32)

h = pathlib.Path(__file__).resolve().parent.parent / 'firmware' / 'pixeltime_sync' / 'cihaz_kimligi.h'
h.write_text(f'''// {serial} — GİZLİ. GitHub'a yükleme.
#pragma once
#define PT_SERIAL     "{serial}"
#define PT_SECRET     "{secret}"
#define PT_CLAIM_CODE "{code}"
''', encoding='utf-8')

print('\n1) Supabase → SQL Editor:\n')
print(f"insert into public.devices (serial, secret, claim_code) values ('{serial}', '{secret}', '{code}');")
print(f'\n2) Yazıldı: {h}')
print(f'\n3) Kutu kartındaki kod: {code[:3]}-{code[3:]}\n')
