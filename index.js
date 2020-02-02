const {
  openBrowser,
  goto,
  write,
  click,
  evaluate,
  $,
  waitFor,
  textBox,
  goBack
} = require("taiko");
const fs = require("fs");

const init = async (path, credentials) => {
  await openBrowser();
  await goto(
    "https://www.amazon.com.br/ap/signin?_encoding=UTF8&ignoreAuthState=1&openid.assoc_handle=brflex&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.mode=checkid_setup&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.ns.pape=http%3A%2F%2Fspecs.openid.net%2Fextensions%2Fpape%2F1.0&openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com.br%2F%3Fref_%3Dnav_signin&switch_account="
  );
  await write(credentials.username);
  await click("Continuar");
  await write(credentials.password);
  await click($("#signInSubmit"));
  await click($("#nav-hamburger-menu"));
  await click("Eletrônicos, TV e Áudio");
  await click("Tudo em Eletrônicos");

  const getAmazonLink = async () => {
    await click($("#amzn-ss-text-link"));
    await click($("#amzn-ss-full-link-radio-button"));
    const text = await textBox({
      id: "amzn-ss-text-fulllink-textarea"
    }).value();
    return text;
  }

  const fallback = async () => {
    const url = await evaluate(() => document.URL);
    await goto(url);
    return getAmazonLink()
  }

  const fetchProductLink = async element => {
    await waitFor(2000);
    await click(element);
    return getAmazonLink();
  };

  const nextStep = async products => {
    await waitFor(2000);
    fs.writeFileSync(
      `${path}/products_${new Date().getTime()}.json`,
      JSON.stringify(products)
    );
    try {
      await click($("#pagnNextLink"));
    } catch (error) {
      await click($('.a-last'))
    }
  };

  const cycleProductsNext = async (currentIteration = 0) => {
    let products = {
      urls: []
    };
    try {
      for (currentIteration; currentIteration < 23; currentIteration += 1) {
        const text = await fetchProductLink($(`//*[@data-index='${currentIteration}']`));
        products.urls.push(text);
        await goBack();
      }
      await nextStep(products);
      await cycleProductsNext();
    } catch (error) {
      console.log(error);
      if (JSON.stringify(error).includes('Custom selector')) {
        await goto(document.URL)
        await cycleProductsNext(currentIteration);
      } else if (JSON.stringify(error).includes('Navigation took more')){
        await goto(document.URL)
        await cycleProductsNext(currentIteration);
      } else {
        const text = await fallback()
        products.urls.push(text)
        await goBack()
        await cycleProductsNext(currentIteration);
      }
    }
  };

  const cycleProducts = async (currentIteration = 0) => {
    let products = {
      urls: []
    };
    try {
      for (currentIteration; currentIteration <= 23; currentIteration += 1) {
        const text = await fetchProductLink($(`#result_${currentIteration} .a-link-normal`));
        products.urls.push(text);
        await goBack();
      }
      await nextStep(products);
      await cycleProductsNext();
    } catch (error) {
      console.log(error);
      if (JSON.stringify(error).includes('Custom selector')) {
        await goto(document.URL)
        await cycleProducts(currentIteration);
      } else if (JSON.stringify(error).includes('Navigation took more')){
        await goto(document.URL)
        await cycleProducts(currentIteration);
      } else {
        const text = await fallback()
        products.urls.push(text)
        await goBack()
        await cycleProducts(currentIteration);
      }
    }
  };
  await cycleProducts();
};

exports.init = init;
