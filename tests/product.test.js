/* eslint-disable security/detect-object-injection */
const request = require('supertest');
const mongoose = require('mongoose');
const { Binary } = require('mongodb');
const app = require('../src/app');
const Product = require('../src/models/productModel');
const {
  userOne,
  userTwo,
  productOne,
  productTwo,
  productThree,
  productFour,
  userThree,
  setupDatabase,
} = require('./fixtures/db');
const { pages } = require('../src/shared/constants');

beforeEach(setupDatabase);

const uploadPhotoForProdOne = async () => {
  await request(app)
    .post(`/products/${productOne._id}/photo`)
    .set('Cookie', [`token=${userOne.tokens[0].token}`])
    .attach('photo', 'tests/fixtures/mushrooms.jpg');
};

describe('POST /products', () => {
  test('Should create product', async () => {
    const data = {
      name: 'Mega mushrooms',
      description: 'Healthy mega mushrooms',
      price: 1.5,
      quantity: 1000,
      condition: 'not_applicable',
    };

    const {
      body: { productId },
    } = await request(app)
      .post('/products')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send(data)
      .expect(201);

    const product = await Product.findById(productId).lean();
    expect(product).toEqual({
      ...data,
      _id: mongoose.Types.ObjectId(productId),
      seller: userOne._id,
      quantitySold: 0,
      buyerQuantity: 0,
      __v: 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  });

  test('Should NOT create product if user is unauthenticated', async () => {
    const newProductId = new mongoose.Types.ObjectId();

    const data = {
      _id: newProductId,
      name: 'Mega mushrooms',
      description: 'Healthy mega mushrooms',
      price: 1.5,
      quantity: 1000,
      condition: 'not_applicable',
    };

    await request(app).post('/products').send(data).expect(401);

    const product = await Product.findById(newProductId).lean();
    expect(product).toBeNull();
  });
});

describe('GET /products', () => {
  describe('Default behaviours', () => {
    test('Should fetch all four products, starting from newest and no skip and no limit by default', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products').expect(200);

      expect(productCount).toEqual(4);
      expect(products).toEqual([
        {
          ...productFour,
          _id: productFour._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userThree.username,
          },
          createdAt: products[0].createdAt,
          updatedAt: products[0].updatedAt,
        },
        {
          ...productThree,
          _id: productThree._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[1].createdAt,
          updatedAt: products[1].updatedAt,
        },
        {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[2].createdAt,
          updatedAt: products[2].updatedAt,
        },
        {
          ...productOne,
          _id: productOne._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userOne.username,
          },
          createdAt: products[3].createdAt,
          updatedAt: products[3].updatedAt,
        },
      ]);

      expect(products[0].createdAt).toBeDefined();
      expect(products[0].updatedAt).toBeDefined();
      expect(products[1].createdAt).toBeDefined();
      expect(products[1].updatedAt).toBeDefined();
      expect(products[2].createdAt).toBeDefined();
      expect(products[2].createdAt).toBeDefined();
      expect(products[3].createdAt).toBeDefined();
      expect(products[3].updatedAt).toBeDefined();
    });

    test('Should fetch default max 10 products if in db are more than 10 products', async () => {
      for (let i = 0; i < 10; i += 1) {
        const product = {
          name: 'Product name',
          description: '',
          price: 10,
          condition: 'new',
          quantity: 1,
          seller: userOne._id,
          quantitySold: 0,
          buyerQuantity: 0,
        };
        await new Product(product).save();
      }

      const {
        body: { products, productCount },
      } = await request(app).get('/products').expect(200);

      expect(productCount).toEqual(14);
      expect(products).toHaveLength(10);
    });
  });

  describe('Name param', () => {
    test('Should fetch only knife if name param is "knife"', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?name=knife`).expect(200);

      expect(productCount).toEqual(1);
      expect(products).toEqual([
        {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[0].createdAt,
          updatedAt: products[0].updatedAt,
        },
      ]);
    });

    test('Should fetch only knife and mushrooms if name param is "r"', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?name=r`).expect(200);

      expect(productCount).toEqual(2);
      expect(products).toEqual([
        {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[0].createdAt,
          updatedAt: products[0].updatedAt,
        },
        {
          ...productOne,
          _id: productOne._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userOne.username,
          },
          createdAt: products[1].createdAt,
          updatedAt: products[1].updatedAt,
        },
      ]);
    });

    test('Should fetch nothing if name param is "abababa" so it completely does not match to anything', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?name=abababa`).expect(200);

      expect(productCount).toEqual(0);
      expect(products).toEqual([]);
    });
  });

  describe('Condition param', () => {
    test('Should fetch only products with condition "new"', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?condition=new').expect(200);

      expect(productCount).toEqual(2);
      expect(products.every((product) => product.condition === 'new')).toEqual(true);
    });

    test('Should fetch only products with condition "used"', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?condition=used').expect(200);

      expect(productCount).toEqual(1);
      expect(products.every((product) => product.condition === 'used')).toEqual(true);
    });

    test('Should fetch only products with condition "not_applicable"', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?condition=not_applicable').expect(200);

      expect(productCount).toEqual(1);
      expect(products.every(({ condition }) => condition === 'not_applicable')).toEqual(true);
    });

    test('Should fetch nothing if passed condition is different than "new", "used" and "not_applicable"', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?condition=sth_different').expect(200);

      expect(productCount).toEqual(0);
      expect(products).toEqual([]);
    });
  });

  describe('Sort param', () => {
    test('Should sort products by name descending', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?sortBy=name:desc').expect(200);

      expect(productCount).toEqual(4);

      for (let i = 0; i < products.length - 1; i += 1) {
        expect(products[i].name >= products[i + 1].name).toEqual(true);
      }
    });

    test('Should sort products by name ascending', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?sortBy=name:asc').expect(200);

      expect(productCount).toEqual(4);

      for (let i = 0; i < products.length - 1; i += 1) {
        expect(products[i].name <= products[i + 1].name).toEqual(true);
      }
    });

    test('Should sort products by price descending', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?sortBy=price:desc').expect(200);

      expect(productCount).toEqual(4);

      for (let i = 0; i < products.length - 1; i += 1) {
        expect(products[i].price >= products[i + 1].price).toEqual(true);
      }
    });

    test('Should sort products by price ascending', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?sortBy=price:asc').expect(200);

      expect(productCount).toEqual(4);

      for (let i = 0; i < products.length - 1; i += 1) {
        expect(products[i].price <= products[i + 1].price).toEqual(true);
      }
    });

    test('Should sort products by price descending and get these with minimum $10 price', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?sortBy=price:desc&minPrice=10`).expect(200);

      expect(productCount).toEqual(3);

      for (let i = 0; i < products.length - 1; i += 1) {
        expect(products[i].price >= products[i + 1].price).toEqual(true);
      }

      expect(products.every(({ price }) => price >= 10)).toEqual(true);
    });

    test('Should sort products by price ascending and get these with maximum $15 price', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?sortBy=price:asc&maxPrice=15`).expect(200);

      expect(productCount).toEqual(2);

      for (let i = 0; i < products.length - 1; i += 1) {
        expect(products[i].price <= products[i + 1].price).toEqual(true);
      }

      expect(products.every(({ price }) => price <= 15)).toEqual(true);
    });
  });

  describe('Limit and p params', () => {
    test('Should fetch three products (newest by default) if limit is 3', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get('/products?limit=3').expect(200);

      expect(productCount).toEqual(4);
      expect(products).toEqual([
        {
          ...productFour,
          _id: productFour._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userThree.username,
          },
          createdAt: products[0].createdAt,
          updatedAt: products[0].updatedAt,
        },
        {
          ...productThree,
          _id: productThree._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[1].createdAt,
          updatedAt: products[1].updatedAt,
        },
        {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[2].createdAt,
          updatedAt: products[2].updatedAt,
        },
      ]);

      expect(products[0].createdAt).toBeDefined();
      expect(products[0].updatedAt).toBeDefined();
      expect(products[1].createdAt).toBeDefined();
      expect(products[1].updatedAt).toBeDefined();
      expect(products[2].createdAt).toBeDefined();
      expect(products[2].updatedAt).toBeDefined();
    });

    test('Should fetch oldest product, and 4 as productCount if p is 4 and limit 1', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?limit=1&p=4`).expect(200);

      expect(productCount).toEqual(4);
      expect(products).toEqual([
        {
          ...productOne,
          _id: productOne._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userOne.username,
          },
          createdAt: products[0].createdAt,
          updatedAt: products[0].updatedAt,
        },
      ]);
    });

    test('Should fetch two oldest products, and 4 as productCount if p is 2 and limit 2', async () => {
      const {
        body: { products, productCount },
      } = await request(app).get(`/products?limit=2&p=2`).expect(200);

      expect(productCount).toEqual(4);
      expect(products).toEqual([
        {
          ...productTwo,
          _id: productTwo._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userTwo.username,
          },
          createdAt: products[0].createdAt,
          updatedAt: products[0].updatedAt,
        },
        {
          ...productOne,
          _id: productOne._id.toJSON(),
          photo: false,
          quantitySold: 0,
          buyerQuantity: 0,
          __v: 0,
          seller: {
            username: userOne.username,
          },
          createdAt: products[1].createdAt,
          updatedAt: products[1].updatedAt,
        },
      ]);
    });
  });

  describe('Page param', () => {
    test(`Should fetch all products expect of logged in user's product if page is ALL_PRODUCTS`, async () => {
      const {
        body: { products, productCount },
      } = await request(app)
        .get(`/products?page=${pages.ALL_PRODUCTS}`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      expect(productCount).toEqual(3);
      expect(products.every(({ seller }) => seller.username !== userOne.username));
    });

    test('Should fetch all products of logged in user if page is MY_PRODUCTS', async () => {
      const {
        body: { products, productCount },
      } = await request(app)
        .get(`/products?page=${pages.MY_PRODUCTS}`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      expect(productCount).toEqual(1);
      expect(products.every(({ seller }) => seller.username === userOne.username));
    });

    test('Should fetch all products of user with passed username', async () => {
      const {
        body: { products, productCount },
      } = await request(app)
        .get(`/products?page=${pages.USER_PRODUCTS}&seller=Major`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      expect(productCount).toEqual(2);
      expect(products.every(({ seller }) => seller.username === userTwo.username));
    });

    test('Should fetch nothing if seller with passed username does not exist and page is USER_PRODUCTS', async () => {
      const {
        body: { products, productCount },
      } = await request(app)
        .get(`/products?page=${pages.USER_PRODUCTS}&seller=unexistingseller`)
        .set('Cookie', [`token=${userOne.tokens[0].token}`])
        .expect(200);

      expect(productCount).toEqual(0);
      expect(products).toEqual([]);
    });
  });
});

describe('GET /products/:id', () => {
  test('Should fetch correct product by id', async () => {
    const {
      body: { product },
    } = await request(app).get(`/products/${productOne._id}`).expect(200);

    expect(product).toEqual({
      ...productOne,
      _id: productOne._id.toJSON(),
      quantitySold: 0,
      buyerQuantity: 0,
      photo: false,
      __v: 0,
      seller: {
        username: userOne.username,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });

    expect(product.createdAt).toBeDefined();
    expect(product.updatedAt).toBeDefined();
  });

  test('Should get 404 if product with passed ObjectId does not exist', async () => {
    const incorrectId = new mongoose.Types.ObjectId();
    const { body } = await request(app).get(`/products/${incorrectId}`).expect(404);
    expect(body).toEqual({
      message: 'Product with given ID does not exist',
    });
  });

  test('Should get 500 if passed id not correct ObjectId', async () => {
    const { body } = await request(app).get('/products/incorrectId').expect(500);
    expect(body.kind).toEqual('ObjectId');
  });
});

describe('PATCH /products/:id', () => {
  test('Should update every value of product which is possible', async () => {
    const data = {
      name: 'Cool mushrooms',
      description: 'Cool healthy mushrooms',
      price: 2,
      quantity: 55,
      condition: 'used',
    };

    const {
      body: { product },
    } = await request(app)
      .patch(`/products/${productOne._id}`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send(data)
      .expect(200);

    expect(product).toEqual({
      ...data,
      _id: productOne._id.toJSON(),
      photo: false,
      quantitySold: 0,
      buyerQuantity: 0,
      __v: 0,
      seller: {
        username: userOne.username,
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });

    expect(product.createdAt).toBeDefined();
    expect(product.updatedAt).toBeDefined();
  });

  test('Should NOT update product if user is not a seller', async () => {
    const { body } = await request(app)
      .patch(`/products/${productOne._id}`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .send({
        name: 'Cool mushrooms',
      })
      .expect(404);

    const product = await Product.findById(productOne._id).lean();
    expect(product.name).toEqual(productOne.name);

    expect(body).toEqual({
      message: 'Product which you try to update does not exist or you are not a seller',
    });
  });

  test('Should NOT update product if user is unauthenticated', async () => {
    await request(app)
      .patch(`/products/${productOne._id}`)
      .send({
        name: 'Cool mushrooms',
      })
      .expect(401);

    const product = await Product.findById(productOne._id).lean();
    expect(product.name).toEqual(productOne.name);
  });

  test('Should get 404 if passed id is not valid ObjectId', async () => {
    const incorrectId = new mongoose.Types.ObjectId();

    const { body } = await request(app)
      .patch(`/products/${incorrectId}`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({
        name: 'Cool mushrooms',
      })
      .expect(404);

    expect(body).toEqual({
      message: 'Product which you try to update does not exist or you are not a seller',
    });
  });

  test('Should get 500 if passed id is not valid id (but not ObjectId)', async () => {
    const { body } = await request(app)
      .patch(`/products/incorrectId`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({
        name: 'Cool mushrooms',
      })
      .expect(500);

    expect(body.kind).toEqual('ObjectId');
  });

  test('Should get 400 if no valid property key is passed', async () => {
    const { body } = await request(app)
      .patch(`/products/${productOne._id}`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .send({
        seller: userTwo._id,
      })
      .expect(400);

    const product = await Product.findById(productOne._id).lean();
    expect(product.seller).toEqual(userOne._id);

    expect(body).toEqual({
      message: `You can't change these data!`,
    });
  });
});

describe('DELETE /products/:id', () => {
  test('Should seller delete product', async () => {
    await request(app)
      .delete(`/products/${productOne._id}`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const product = await Product.findById(productOne._id).lean();
    expect(product).toBeNull();
  });

  test(`Should admin delete other user's product`, async () => {
    await request(app)
      .delete(`/products/${productOne._id}`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const product = await Product.findById(productOne._id).lean();
    expect(product).toBeNull();
  });

  test('Should NOT delete product if user is unauthenticated', async () => {
    await request(app).delete(`/products/${productOne._id}`).expect(401);
    const product = await Product.findById(productOne._id).lean();
    expect(product).not.toBeNull();
  });

  test(`Should NOT delete other user's product`, async () => {
    const { body } = await request(app)
      .delete(`/products/${productOne._id}`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(403);

    const product = await Product.findById(productOne._id).lean();
    expect(product).not.toBeNull();

    expect(body).toEqual({
      message: 'You are not allowed to do this',
    });
  });

  test('Should get 404 if passed incorrect ObjectId', async () => {
    const incorrectId = new mongoose.Types.ObjectId();

    const { body } = await request(app)
      .delete(`/products/${incorrectId}`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(404);

    expect(body).toEqual({
      message: 'Product with given ID does not exist',
    });
  });

  test('Should get 500 if passed incorrect id (but not ObjectId)', async () => {
    const { body } = await request(app)
      .delete('/products/incorrectId')
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(500);

    expect(body.kind).toEqual('ObjectId');
  });
});

describe('POST /products/:id/photo', () => {
  test('Should upload photo for first product', async () => {
    await uploadPhotoForProdOne();

    const product = await Product.findById(productOne._id).lean();

    expect(product).toEqual({
      ...productOne,
      quantitySold: 0,
      buyerQuantity: 0,
      photo: product.photo,
      __v: 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
    expect(product.photo).toBeInstanceOf(Binary);
  });

  test('Should NOT upload photo for first product by not a seller', async () => {
    const { body } = await request(app)
      .post(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .attach('photo', 'tests/fixtures/mushrooms.jpg')
      .expect(403);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeUndefined();

    expect(body).toEqual({
      message: 'You are not allowed to do this',
    });
  });

  test('Should NOT upload photo if user is unauthenticated', async () => {
    await request(app)
      .post(`/products/${productOne._id}/photo`)
      .attach('photo', 'tests/fixtures/mushrooms.jpg')
      .expect(401);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeUndefined();
  });

  test('Should get 404 if product with passed ObjectId does not exist', async () => {
    const incorrectId = new mongoose.Types.ObjectId();

    const { body } = await request(app)
      .post(`/products/${incorrectId}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .attach('photo', 'tests/fixtures/mushrooms.jpg')
      .expect(404);

    expect(body).toEqual({
      message: 'Product with given ID does not exist',
    });
  });

  test('Should get 500 if passed id is not correct ObjectId', async () => {
    const { body } = await request(app)
      .post('/products/incorrectId/photo')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .attach('photo', 'tests/fixtures/mushrooms.jpg')
      .expect(500);

    expect(body.kind).toEqual('ObjectId');
  });
});

describe('GET /products/:id/photo', () => {
  test('Should get product photo', async () => {
    await uploadPhotoForProdOne();

    const { body } = await request(app)
      .get(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    expect(body).toEqual(expect.any(Buffer));
  });

  test('Should get 404 if product with given ObjectId does not exist', async () => {
    const incorrectId = new mongoose.Types.ObjectId();

    const { body } = await request(app)
      .get(`/products/${incorrectId}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(404);

    expect(body).toEqual({
      message: 'Product with given ID does not exist',
    });
  });

  test('Should get 500 if given ID is not correct ObjectId', async () => {
    await request(app)
      .get(`/products/incorrectId/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(500);
  });

  test('Should get 404 if product with given ObjectId does not have any photo', async () => {
    const { body } = await request(app)
      .get(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(404);

    expect(body).toEqual({
      message: 'Product with given ID does not have any photo',
    });
  });
});

describe('DELETE /products/:id/photo', () => {
  test('Should seller delete product photo', async () => {
    await uploadPhotoForProdOne();

    await request(app)
      .delete(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(200);

    const product = await Product.findById(productOne._id).lean();

    expect(product).toEqual({
      ...productOne,
      quantitySold: 0,
      buyerQuantity: 0,
      photo: undefined,
      __v: 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  });

  test(`Should admin delete other user's product photo`, async () => {
    await uploadPhotoForProdOne();

    await request(app)
      .delete(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userThree.tokens[0].token}`])
      .expect(200);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeUndefined();
  });

  test('Should NOT delete photo if user is unauthenticated', async () => {
    await uploadPhotoForProdOne();

    await request(app)
      .delete(`/products/${productOne._id}/photo`)
      .attach('photo', 'tests/fixtures/mushrooms.jpg')
      .expect(401);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeInstanceOf(Binary);
  });

  test('Should get 404 if product with passed ObjectId does not exist', async () => {
    await uploadPhotoForProdOne();

    const incorrectId = new mongoose.Types.ObjectId();

    const { body } = await request(app)
      .delete(`/products/${incorrectId}/photo`)
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(404);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeInstanceOf(Binary);

    expect(body).toEqual({
      message: 'Product with given ID does not exist',
    });
  });

  test('Should get 500 if passed ID is not correct ObjectId', async () => {
    await uploadPhotoForProdOne();

    await request(app)
      .delete('/products/incorrectId/photo')
      .set('Cookie', [`token=${userOne.tokens[0].token}`])
      .expect(500);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeInstanceOf(Binary);
  });

  test(`Should get 403 if user is trying to delete other user's product photo`, async () => {
    await uploadPhotoForProdOne();

    const { body } = await request(app)
      .delete(`/products/${productOne._id}/photo`)
      .set('Cookie', [`token=${userTwo.tokens[0].token}`])
      .expect(403);

    const product = await Product.findById(productOne._id).lean();
    expect(product.photo).toBeInstanceOf(Binary);

    expect(body).toEqual({
      message: 'You are not allowed to do this',
    });
  });
});
