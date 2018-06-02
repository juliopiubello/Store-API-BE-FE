import axios from 'axios';
import dompurify from 'dompurify'

function searchResultsHTML(stores){
    return stores.map(store => {
        return`
            <a href="/stores/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            </a>
        `;
    }).join('');
}

function typeAhead(search){
    //console.log(search);
    if ( !search ) return;

    const searchInput = search.querySelector('input[name="search"]');

    const searchResults = search.querySelector('.search__results');

    //console.log(searchInput, searchResults)

    searchInput.on('input', function(){
        //console.log(this.value);
        // if there is no value, quit it!
        if( !this.value ) {
            searchResults.style.display = 'none';
            return; // stop
        }

        //show the serach results!
        searchResults.style.display = 'block';
        //searchResults.innerHTML = '';

        axios
            .get(`/api/search?q=${this.value}`)
            .then(res => {
                //console.log(res.data)
                if(res.data.length){
                    //console.log('There is something to show!');
                    const html = dompurify.sanitize(searchResultsHTML(res.data));
                    //console.log(html);
                    searchResults.innerHTML = html;
                    return;
                }
                // tell them nothing came back
                searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value}</div>`);
                
            })
            .catch(err => {
                console.error(err);
            });
    });

    //handle keyboard inputs
    searchInput.on('keyup', (e) => {
        console.log(e.keyCode);
        //if they aren't pressing up, down or enter, who cares!
        if(![38, 40, 13].includes(e.keyCode)){
            return; // skip it!
        }
        //console.log('Do something!');
        const activeClass = 'search__result--active';
        const current = search.querySelector(`.${activeClass}`);
        const items = search.querySelectorAll('.search__result');
        let next;
        if (e.keyCode === 40 && current ){
            next = current.nextElementSibling || items[0];
        }else if(e.keyCode === 40){
            next = items[0];
        }else if(e.keyCode === 38 && current){
            next = current.previousElementSibling || items[items.length - 1]
        }else if (e.keyCode === 38){
            next = items[items.length - 1];
        }else if(e.keyCode === 13 && current.href){
            window.location = current.href;
            return;
        }
        if(current){
            current.classList.remove(activeClass)
        }
        next.classList.add(activeClass);
        console.log(next);
    })

}

export default typeAhead