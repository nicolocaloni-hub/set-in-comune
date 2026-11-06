import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePortfolio,portfolioLabel,PORTFOLIO_MAX} from '../src/marketplace.js';

test('portfolio links are normalised to https and deduplicated',()=>{
 assert.deepEqual(validatePortfolio(['vimeo.com/123',' https://www.IMDb.com/name/nm1/ ','','https://vimeo.com/123']),['https://vimeo.com/123','https://www.imdb.com/name/nm1/']);
 assert.deepEqual(validatePortfolio([]),[]);
 assert.equal(PORTFOLIO_MAX,4);
});

test('unsafe or unsupported links are rejected',()=>{
 for(const bad of ['http://example.it/','javascript:alert(1)','data:text/html,x','https://user:pw@example.it/','https://example.it:8443/','https://localhost/','https://192.168.1.1/','https://exa mple.it/','https://example.it/'+'a'.repeat(300)])
  assert.throws(()=>validatePortfolio([bad]),/link|Link/,bad);
 assert.throws(()=>validatePortfolio(['a.it','b.it','c.it','d.it','e.it']),/fino a 4/);
 assert.throws(()=>validatePortfolio('https://a.it/'),/non validi/);
});

test('labels name known services and fall back to the host',()=>{
 assert.equal(portfolioLabel('https://vimeo.com/1'),'Vimeo');
 assert.equal(portfolioLabel('https://youtu.be/x'),'YouTube');
 assert.equal(portfolioLabel('https://www.instagram.com/x'),'Instagram');
 assert.equal(portfolioLabel('https://www.mysite.it/'),'mysite.it');
 assert.equal(portfolioLabel('not a url'),'Link');
});

test('client rule and SQL constraint accept the same normalised URLs',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261107090000_profile_portfolio.sql',import.meta.url),'utf8');
 const one=sql.match(/'\^(https:[^ ]+?)\( https/)[1];
 const re=new RegExp('^'+one.replace('[^[:space:]<>"]','[^\\s<>"]')+'$');
 for(const href of validatePortfolio(['vimeo.com/123','https://www.imdb.com/name/nm1/?ref=x#y','tuosito.it']))assert.ok(re.test(href),href);
});
