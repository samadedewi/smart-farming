const http = require('http');

const loginPayload = JSON.stringify({ email: 'shinta@gmail.com', password: 'password' });

const loginReq = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': loginPayload.length }
}, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const token = JSON.parse(data).token;
        console.log('Got token:', token ? 'yes' : 'no');
        
        const payload = JSON.stringify({
            "id": 1,
            "user_id": 5,
            "nama_blok": "Lahan Kauditan (Andosol)",
            "luas_lahan": 500,
            "jenis_tanah": "Andosol",
            "tekstur": "Lempung",
            "kecamatan": "Kauditan",
            "id_varietas": "NK Perkasa",
            "tanggal_tanam": "2026-05-18T16:00:00.000Z",
            "umur_tanaman_aktif": 0,
            "n_dasar": 50,
            "p_dasar": 40,
            "k_dasar": 30,
            "created_at": "2026-05-18T16:26:40.000Z",
            "benih_per_lubang": 2
        });

        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: '/api/lahan/1',
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payload.length,
                'Authorization': `Bearer ${token}`
            }
        }, r2 => {
            let d2 = '';
            r2.on('data', chunk => d2 += chunk);
            r2.on('end', () => console.log('PUT RESPONSE:', r2.statusCode, d2));
        });
        req.write(payload);
        req.end();
    });
});
loginReq.write(loginPayload);
loginReq.end();
