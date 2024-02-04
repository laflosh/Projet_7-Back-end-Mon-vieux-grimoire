const Book = require("../_models/Book");
const sharp = require("sharp");
const fs = require("fs");

exports.getAllBooks = (req, res, next) => {

    Book.find()
    .then(books => res.status(200).json(books))
    .catch(error => res.status(400).json( error ));

};

exports.getOneBook = (req, res, next) => {

    Book.findOne({ _id: req.params.id})
    .then(book => res.status(200).json(book))
    .catch(error => res.status(404).json( error ));

};

exports.getBestRating = (req, res, next) => {

    Book.find()
    .sort({averageRating: -1})
    .limit(3)
    .then(allBooks => res.status(200).json( allBooks ))
    .catch(error => res.status(400).json( error ));

};

exports.createBook = async (req, res, next) => {

    const dto = JSON.parse(req.body.book);

    delete dto._id;
    dto.userId = req.auth.userId;

    if (req.file != undefined) {

        let filename = await multer.createImage(req.file);
        dto.imageUrl = `${req.protocol}://${req.get("host")}/booksImages/${filename}`;
    }

    let book = new Book ({

        ...dto,
        ratings: [],
        averageRating: 0

    })

    if (dto.ratings[0].grade > 0) {

        book.ratings.push({
            userId: req.auth.userId,
            rating: dto.ratings[0].rating
        })

        book.averageRating = book.ratings[0].rating
    }
    
    book.save()
    .then(() => res.status(201).json({ message: "Livre ajouté à la base de donnée."}))
    .catch(error => res.status(400).json( error ));

};

exports.addBookRating = (req, res, next) => {

    Book.findOne({ _id: req.params.id})
    .then(book => {
        let allRating = book.ratings;

        let allRatingValue = [];
        allRating.forEach(elm => {allRatingValue.push(elm.rating)})

        let sommeAllRating = allRatingValue.reduce((acc, curr) => acc + curr) + req.body.rating;

        let newAverageRating = sommeAllRating / (allRating.length + 1);

        allRating.forEach(property => { 
            if (property.userId === req.body.userId) {

                res.status(401).json({ message : "Vous avez déjà noté ce livre."});

            } else {

                Book.updateOne({ _id: req.params.id },{$push:{

                    ratings: [
                        {
                        userId: req.auth.userId,
                        rating: req.body.rating
                        }
                    ],

                }})
                .then(() => {

                    Book.updateOne({ _id: req.params.id },{

                        averageRating: newAverageRating
    
                    })
                    .then(() => {

                        Book.findOne({ _id: req.params.id})
                        .then(book => res.status(201).json( book ))

                    })
                    .catch(error => res.status(401).json({ error }));

                })
                .catch(error => res.status(401).json({ error }));

            }
        
        })   

    })
    .catch( error => res.status(400).json({ error }));

};

exports.modifyBook = (req, res, next) => {

    const bookObject = req.file ? {

        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get("host")}/booksImages/${req.file.filename}`

    } : { ...req.body };

    delete bookObject.userId;

    Book.findOne({ _id: req.params.id })
    .then((book) => {

        if ( book.userId !== req.auth.userId ) {

            res.status(401).json({ message: "Vous ne disposez pas des droits pour effectuer cette action."});

        } else {

            Book.updateOne({ _id: req.params.id}, {...bookObject, _id: req.params.id})
            .then(() => res.status(200).json({ message: "Livre mis à jour."}))
            .catch(error => res.status(400).json({ error }));

        }
    })
    .catch(error => res.status(400).json({ error}))

};

exports.deleteBook = (req, res, next) => {

    Book.findOne({ _id: req.params.id })
    .then(book => {

        if (book.userId !== req.auth.userId){

            res.status(401).json({ message: "Vous n'êtes pas autorisé à faire cette action."});

        }

        const filename = book.imageUrl.split("/booksImages/")[1];

        fs.unlinkSync(`_images/booksImages/${filename}`)

        Book.deleteOne({ _id: book._id })
        .then(() => res.status(200).json({ message: "Livre supprimé."}))
        .catch(error => res.status(401).json( error ));
        
    })
    .catch(error => res.status(500).json( error ));

};