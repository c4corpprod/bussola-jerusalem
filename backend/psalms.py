# ═══════════════════════════════════════════════════════════════
# 📖 SALMOS — Bússola para Jerusalém
# © 2026 Marcos Fernando — C4 Corporation
#
# Salmos em Português e Hebraico para tokens de autenticação
# ═══════════════════════════════════════════════════════════════

import random

SALMOS = [
    {
        "ref": "Salmo 122:6",
        "pt": "Orai pela paz de Jerusalém! Prosperarão aqueles que te amam.",
        "he": "שַׁאֲלוּ שְׁלוֹם יְרוּשָׁלָיִם יִשְׁלָיוּ אֹהֲבָיִךְ"
    },
    {
        "ref": "Salmo 137:5",
        "pt": "Se eu me esquecer de ti, ó Jerusalém, que a minha mão direita se esqueça da sua destreza.",
        "he": "אִם אֶשְׁכָּחֵךְ יְרוּשָׁלָיִם תִּשְׁכַּח יְמִינִי"
    },
    {
        "ref": "Salmo 125:2",
        "pt": "Assim como os montes cercam Jerusalém, assim o Senhor cerca o seu povo.",
        "he": "יְרוּשָׁלַיִם הָרִים סָבִיב לָהּ וַיהוָה סָבִיב לְעַמּוֹ"
    },
    {
        "ref": "Salmo 48:1-2",
        "pt": "Grande é o Senhor e muito digno de louvor, na cidade do nosso Deus, no seu monte santo.",
        "he": "גָּדוֹל יְהוָה וּמְהֻלָּל מְאֹד בְּעִיר אֱלֹהֵינוּ הַר קָדְשׁוֹ"
    },
    {
        "ref": "Salmo 147:2",
        "pt": "O Senhor edifica Jerusalém; congrega os dispersos de Israel.",
        "he": "בּוֹנֵה יְרוּשָׁלַיִם יְהוָה נִדְחֵי יִשְׂרָאֵל יְכַנֵּס"
    },
    {
        "ref": "Salmo 51:18",
        "pt": "Faze o bem a Sião, segundo a tua boa vontade; edifica os muros de Jerusalém.",
        "he": "הֵיטִיבָה בִרְצוֹנְךָ אֶת צִיּוֹן תִּבְנֶה חוֹמוֹת יְרוּשָׁלָיִם"
    },
    {
        "ref": "Salmo 102:21",
        "pt": "Para que se anuncie o nome do Senhor em Sião e o seu louvor em Jerusalém.",
        "he": "לְסַפֵּר בְּצִיּוֹן שֵׁם יְהוָה וּתְהִלָּתוֹ בִּירוּשָׁלָיִם"
    },
    {
        "ref": "Salmo 128:5",
        "pt": "O Senhor te abençoará desde Sião, e tu verás o bem de Jerusalém todos os dias da tua vida.",
        "he": "יְבָרֶכְךָ יְהוָה מִצִּיּוֹן וּרְאֵה בְּטוּב יְרוּשָׁלָיִם כֹּל יְמֵי חַיֶּיךָ"
    },
    {
        "ref": "Salmo 135:21",
        "pt": "Bendito seja o Senhor desde Sião, aquele que habita em Jerusalém. Louvai ao Senhor!",
        "he": "בָּרוּךְ יְהוָה מִצִּיּוֹן שֹׁכֵן יְרוּשָׁלָיִם הַלְלוּ יָהּ"
    },
    {
        "ref": "Salmo 116:19",
        "pt": "Nos átrios da casa do Senhor, no meio de ti, ó Jerusalém. Louvai ao Senhor!",
        "he": "בְּחַצְרוֹת בֵּית יְהוָה בְּתוֹכֵכִי יְרוּשָׁלָיִם הַלְלוּ יָהּ"
    },
    {
        "ref": "Salmo 23:1",
        "pt": "O Senhor é o meu pastor; nada me faltará.",
        "he": "יְהוָה רֹעִי לֹא אֶחְסָר"
    },
    {
        "ref": "Salmo 27:1",
        "pt": "O Senhor é a minha luz e a minha salvação; a quem temerei?",
        "he": "יְהוָה אוֹרִי וְיִשְׁעִי מִמִּי אִירָא"
    },
    {
        "ref": "Salmo 91:1",
        "pt": "Aquele que habita no esconderijo do Altíssimo, à sombra do Todo-Poderoso descansará.",
        "he": "יֹשֵׁב בְּסֵתֶר עֶלְיוֹן בְּצֵל שַׁדַּי יִתְלוֹנָן"
    },
    {
        "ref": "Salmo 121:1-2",
        "pt": "Elevo os meus olhos para os montes: de onde me virá o socorro? O meu socorro vem do Senhor.",
        "he": "אֶשָּׂא עֵינַי אֶל הֶהָרִים מֵאַיִן יָבֹא עֶזְרִי עֶזְרִי מֵעִם יְהוָה"
    },
    {
        "ref": "Salmo 150:6",
        "pt": "Tudo quanto tem fôlego louve ao Senhor. Louvai ao Senhor!",
        "he": "כֹּל הַנְּשָׁמָה תְּהַלֵּל יָהּ הַלְלוּ יָהּ"
    },
    {
        "ref": "Salmo 46:10",
        "pt": "Aquietai-vos e sabei que eu sou Deus; serei exaltado entre as nações.",
        "he": "הַרְפּוּ וּדְעוּ כִּי אָנֹכִי אֱלֹהִים אָרוּם בַּגּוֹיִם"
    },
    {
        "ref": "Salmo 19:1",
        "pt": "Os céus declaram a glória de Deus e o firmamento anuncia a obra das suas mãos.",
        "he": "הַשָּׁמַיִם מְסַפְּרִים כְּבוֹד אֵל וּמַעֲשֵׂה יָדָיו מַגִּיד הָרָקִיעַ"
    },
    {
        "ref": "Salmo 34:8",
        "pt": "Provai e vede que o Senhor é bom; bem-aventurado o homem que nele confia.",
        "he": "טַעֲמוּ וּרְאוּ כִּי טוֹב יְהוָה אַשְׁרֵי הַגֶּבֶר יֶחֱסֶה בּוֹ"
    },
    {
        "ref": "Salmo 133:1",
        "pt": "Oh! Quão bom e quão suave é que os irmãos vivam em união.",
        "he": "הִנֵּה מַה טּוֹב וּמַה נָּעִים שֶׁבֶת אַחִים גַּם יָחַד"
    },
    {
        "ref": "Salmo 100:1-2",
        "pt": "Celebrai com júbilo ao Senhor, todas as terras. Servi ao Senhor com alegria.",
        "he": "הָרִיעוּ לַיהוָה כָּל הָאָרֶץ עִבְדוּ אֶת יְהוָה בְּשִׂמְחָה"
    }
]


def get_random_salmo():
    """Retorna um salmo aleatório com referência, texto PT e Hebraico"""
    return random.choice(SALMOS)


def format_salmo_for_email(salmo):
    """Formata o salmo para o corpo do email de token"""
    return f"""
✡ {salmo['ref']} ✡

📖 {salmo['pt']}

🕎 {salmo['he']}
"""
