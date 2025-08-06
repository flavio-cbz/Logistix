#!/usr/bin/env tsx

/**
 * Test simple de l'API d'authentification Vinted
 */

import axios from 'axios';

const API_BASE = 'http://localhost:3000';

// Cookie de test
const TEST_COOKIE = process.env.VINTED_TEST_COOKIE || "v_udt=UzdITVZydENVSlp1Vm5SSy9Na01HNDBNcHVmWS0tWGs2aHBxakJ4RHYvcW1lRi0tMmk3dW8xNUhqUEFpV0hQKzNWNjR3Zz09; anonymous-locale=fr; anon_id=004de3da-c5a2-4bad-be62-af192b0bd515; anon_id=004de3da-c5a2-4bad-be62-af192b0bd515; last_user_id=1; v_uid=276622327; v_sid=21c9522c-1754056805; access_token_web=eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhcHBfaWQiOjQsImNsaWVudF9pZCI6IndlYiIsImF1ZCI6ImZyLmNvcmUuYXBpIiwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwic3ViIjoiMjc2NjIyMzI3IiwiaWF0IjoxNzU0MjQ5MDA1LCJzaWQiOiIyMWM5NTIyYy0xNzU0MDU2ODA1Iiwic2NvcGUiOiJ1c2VyIiwiZXhwIjoxNzU0MjU2MjA1LCJwdXJwb3NlIjoiYWNjZXNzIiwiYWN0Ijp7InN1YiI6IjI3NjYyMjMyNyJ9LCJhY2NvdW50X2lkIjoyMTc1OTgxMTF9.GEoBrXJnq7zBzxP38jWHz0r9KYMY1nURHLuVVghvaqvuEmO3W00Y9fwdlnCopD0UGk2wFHTO1KnK9a_hR0ZdQqt5kaoatF6fKOO5Tk9YfqH-N_4UCezN21Y7hP8atrxfQCIdmn_rtQyzgtzTdCBJtM4P965N7mJ8H8qV7liGDVL7qtFQ9P2s2iLiraLv4220-BCme22igh_Kk7uBioMu6Zd64EA6RZYN_1GMZUOsHLSvvenS4IqP4f1puE0Yg2QwF1QSaCFx6sm3CFuRrjHPcbpWNyCaIg4d23Z9Y0Dm-dbBNzMdr8uj3muvG_Wvgts5PsGyxR9yblpJkcDujvAo1A; refresh_token_web=eyJraWQiOiJFNTdZZHJ1SHBsQWp1MmNObzFEb3JIM2oyN0J1NS1zX09QNVB3UGlobjVNIiwiYWxnIjoiUFMyNTYifQ.eyJhcHBfaWQiOjQsImNsaWVudF9pZCI6IndlYiIsImF1ZCI6ImZyLmNvcmUuYXBpIiwiaXNzIjoidmludGVkLWlhbS1zZXJ2aWNlIiwic3ViIjoiMjc2NjIyMzI3IiwiaWF0IjoxNzU0MjQ5MDA1LCJzaWQiOiIyMWM5NTIyYy0xNzU0MDU2ODA1Iiwic2NvcGUiOiJ1c2VyIiwiZXhwIjoxNzU0ODUzODA1LCJwdXJwb3NlIjoicmVmcmVzaCIsImFjdCI6eyJzdWIiOiIyNzY2MjIzMjcifSwiYWNjb3VudF9pZCI6MjE3NTk4MTExfQ.ROQlVQg62R3JhNtWd72xKicohYyFXHX90mcuodXnr018X9_CvXyGkXArI0RZPm51e58CYl4UBJuo9ggcuq2Q5ewYWUmqFC4NrVKEw7T8frlDw92Wgc4kgDUnlDgaycKO3cv_Cr_UPtzP0Uxjj9D8PsN6ZeOBQSMnDDWQyAVCBLql7hAoVPAGQ08LI9y3WoXD82yYA9Kda79_AwdrW4gN9-q9noCwZ9bXYUY6l5PNQArFaUXr5OhSVv1zQZIW2LTXv5P3rzzC-cJBIZWq_pSSP3_yGGyMYdqUZ0eJArtmSQvs16KjsN8DDirAWZ0WK-8W2sMmnNWBNnptOMfxAgcNjA; domain_selected=true; __cf_bm=At2f2O3Oru9py0AJTqpEqWe718pCXMxo4vzEwX56PVs-1754252897-1.0.1.1-suV16_a9V0q.RhNsg9mt.cR.7hogHHvQQCaitjXauIYCswkh8Dugwh2.DC9rlk8MVS40JSHBKR3D3shu8aPBuXscAaL.pPPjLCDnA0yVHh_PAz6KHy1mjBx5GiAtZH5a; cf_clearance=a56fqlIHi31R785woNpawP_x68uiZ3PGuOGmbtA.36k-1754252898-1.2.1.1-ujLj7OYtxLWGtXfx86pM5ePV1yqi9BWKksUBAdnv53DQ7BTcBgPtiWdzC060KgKkJEIINTt5aQ84jjEQfHQB0V595o56yDhDYJfiNZS2AJWsamz3r9E8qobYCYIbWA64K6UDcgIkkLMZ7xHOM6IFJkqYCJ.KvaInT04mnnJoV_rw8G.osn7yqOPsrgOQqs2fA7uEu_T8BTEt3DrU2sIx3JMpmKsJaN1a9.FKOEVYaJ4; homepage_session_id=838a1133-d625-46e0-8dab-a9615140a9b0; seller_header_visits=2; viewport_size=1264; _vinted_fr_session=VzUrR3lReFRGb3NYZGNJTkFvZkxEVXg1V2FDQUtxQU9hMFVpb0hQdDlCcHFLYkMzU1dNQ2lvTzZOYVRhU2N6SENkRmM2YThoOW9Dd1FMWHNDcW93clpQTkY0ZXVrQVNXZkxpTTFuaEpaUndVRWhTcGJuWTNPNnZsSlhVL0R5Sm5nM3dwZ05QdXJVNDBXcmk2UnB0UDZyWExWeVJ1Mkl6QmllQi93WXlDZnkwalVlVlBDTzNXOGJBRVBra2VOTVVwQXVORnA0aWt5em1sai80cGdFektIZy8ycnYrdmVHN09YL1AxNkVSeStTRUFCbXFwa3BKdVdqR1VqWkJqOFJQWC0tQ0ZvbFZSaEtHUVVIaEZLeVA4bzA2QT09--b4edcbd186cb1380b1ab7445053e6fc23c98c005; datadome=qY5pwmxkQVNZP6tknGpS5Fe1QqLSZTbWH7ndAKqGHjxoF4mDt3l~I1t5JBEuVdD9adCFY3YmzhK_JPvbJUkfea7~BiyX6Omb~cWVCzjZyQC3lctZvAD_Aivpx4I5QiRy";

async function testAuth() {
    console.log('🧪 Test simple de l\'authentification Vinted\n');

    try {
        // 1. POST du cookie
        console.log('📝 Configuration du cookie...');
        const postResponse = await axios.post(`${API_BASE}/api/v1/vinted/auth`, {
            cookie: TEST_COOKIE
        });

        console.log('✅ Cookie configuré:', postResponse.data);

        // 2. GET pour vérifier l'état
        console.log('\n🔐 Vérification de l\'authentification...');
        const getResponse = await axios.get(`${API_BASE}/api/v1/vinted/auth`);

        console.log('État d\'authentification:', getResponse.data);

        if (getResponse.data.authenticated || getResponse.data.tokens?.accessToken) {
            console.log('✅ Authentification réussie!');

            if (getResponse.data.tokens?.accessToken) {
                console.log(`Token d'accès: ${getResponse.data.tokens.accessToken.substring(0, 50)}...`);
            }
        } else {
            console.log('❌ Authentification échouée');
        }

    } catch (error: any) {
        console.error('❌ Erreur:', error.message);
        if (error.response) {
            console.error('Détails:', error.response.data);
        }
    }
}

testAuth();